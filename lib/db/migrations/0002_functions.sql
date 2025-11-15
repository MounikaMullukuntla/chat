-- =====================================================
-- Database Functions
-- File: 0002_functions.sql
-- Description: Creates all database functions
-- =====================================================

-- Helper function to get user role from JWT
-- Used by RLS policies to check if user is admin
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role',
    'user'
  )::TEXT;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to validate user_id exists in auth.users
-- Provides FK-like protection since cross-schema FKs not allowed in Supabase
CREATE OR REPLACE FUNCTION public.validate_user_id()
RETURNS TRIGGER AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if user_id exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.user_id) INTO user_exists;

  IF NOT user_exists THEN
    RAISE EXCEPTION 'user_id % does not exist in auth.users', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle CASCADE DELETE when auth.users row is deleted
-- Replicates FK CASCADE DELETE behavior
CREATE OR REPLACE FUNCTION public.handle_auth_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the deletion (for debugging)
  RAISE NOTICE 'Deleting data for user: %', OLD.id;

  -- Delete user's chats (cascades to messages, votes, streams via existing FKs)
  DELETE FROM public."Chat" WHERE user_id = OLD.id;

  -- Delete user's documents (cascades to suggestions via existing FK)
  DELETE FROM public."Document" WHERE user_id = OLD.id;

  -- Delete user's suggestions (if any remain)
  DELETE FROM public."Suggestion" WHERE user_id = OLD.id;

  -- Delete user's usage logs
  DELETE FROM public.usage_logs WHERE user_id = OLD.id;

  -- Delete user's rate limit tracking
  DELETE FROM public.rate_limit_tracking WHERE user_id = OLD.id;

  -- Delete user's GitHub repositories
  DELETE FROM public.github_repositories WHERE user_id = OLD.id;

  -- Clear error log resolution (set resolved_by to NULL since logs should persist)
  UPDATE public.error_logs SET resolved_by = NULL WHERE resolved_by = OLD.id;

  -- Clear admin config updates (set to NULL since config should persist)
  UPDATE public.admin_config SET updated_by = NULL WHERE updated_by = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's usage summary (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION get_current_user_usage_summary(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_calls BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_tokens BIGINT,
    total_cost NUMERIC,
    agent_breakdown JSONB
) AS $$
BEGIN
    -- This function uses SECURITY INVOKER (default) so it runs with caller's permissions
    -- RLS policies will automatically filter to current user's data
    
    RETURN QUERY
    WITH user_summary AS (
        SELECT 
            COUNT(*) as calls,
            COALESCE(SUM(input_tokens), 0) as input_tokens,
            COALESCE(SUM(output_tokens), 0) as output_tokens,
            COALESCE(SUM(total_tokens), 0) as tokens,
            COALESCE(SUM(total_cost::numeric), 0) as cost
        FROM usage_logs 
        WHERE DATE(request_timestamp) BETWEEN p_start_date AND p_end_date
        -- RLS will automatically filter to current user
    ),
    agent_breakdown AS (
        SELECT jsonb_object_agg(
            agent_type,
            jsonb_build_object(
                'calls', COUNT(*),
                'tokens', COALESCE(SUM(total_tokens), 0),
                'cost', COALESCE(SUM(total_cost::numeric), 0)
            )
        ) as breakdown
        FROM usage_logs
        WHERE DATE(request_timestamp) BETWEEN p_start_date AND p_end_date
        -- RLS will automatically filter to current user
        GROUP BY agent_type
    )
    SELECT 
        us.calls,
        us.input_tokens,
        us.output_tokens, 
        us.tokens,
        us.cost,
        COALESCE(ab.breakdown, '{}'::jsonb)
    FROM user_summary us
    CROSS JOIN agent_breakdown ab;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to automatically update the updated_at timestamp for admin_config
CREATE OR REPLACE FUNCTION update_admin_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update the updated_at timestamp for model_config
CREATE OR REPLACE FUNCTION update_model_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure only one default model per provider
CREATE OR REPLACE FUNCTION ensure_single_default_model_per_provider()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new/updated model is being set as default
    IF NEW.is_default = true THEN
        -- Unset default flag for all other models of the same provider
        UPDATE model_config
        SET is_default = false
        WHERE provider = NEW.provider
        AND model_id != NEW.model_id
        AND is_default = true;
    END IF;

    -- Ensure at least one active model is default per provider
    -- If this is the last default being disabled, prevent it
    IF NEW.is_default = false AND OLD.is_default = true THEN
        IF NOT EXISTS (
            SELECT 1 FROM model_config
            WHERE provider = NEW.provider
            AND model_id != NEW.model_id
            AND is_default = true
        ) THEN
            RAISE EXCEPTION 'Cannot remove default flag - at least one model must be default for provider %', NEW.provider;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate admin config JSON structure
CREATE OR REPLACE FUNCTION validate_admin_config_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation for app_settings and other special configs
    IF NEW.config_key = 'app_settings' OR NEW.config_key LIKE 'model_config_%' THEN
        RETURN NEW;
    END IF;

    -- Validate new agent configuration structure
    IF NEW.config_key LIKE 'chat_model_agent_%' OR
       NEW.config_key LIKE 'provider_tools_agent_%' OR
       NEW.config_key LIKE 'document_agent_%' OR
       NEW.config_key LIKE 'python_agent_%' OR
       NEW.config_key LIKE 'mermaid_agent_%' OR
       NEW.config_key LIKE 'git_mcp_agent_%' THEN

        -- All new agent configs must have enabled and rateLimit
        IF NOT (NEW.config_data ? 'enabled') THEN
            RAISE EXCEPTION 'Admin config for % must include enabled field', NEW.config_key;
        END IF;

        IF NOT (NEW.config_data ? 'rateLimit') THEN
            RAISE EXCEPTION 'Admin config for % must include rateLimit', NEW.config_key;
        END IF;

        -- Validate new rateLimit structure: { "perMinute": 10, "perHour": 100, "perDay": 1000 }
        IF NOT (NEW.config_data->'rateLimit' ? 'perMinute') OR
           NOT (NEW.config_data->'rateLimit' ? 'perHour') OR
           NOT (NEW.config_data->'rateLimit' ? 'perDay') THEN
            RAISE EXCEPTION 'rateLimit must include perMinute, perHour, and perDay for %', NEW.config_key;
        END IF;

        -- Tool-based agents validation (new structure with tools object)
        IF NEW.config_key LIKE 'document_agent_%' OR
           NEW.config_key LIKE 'python_agent_%' OR
           NEW.config_key LIKE 'mermaid_agent_%' OR
           NEW.config_key LIKE 'git_mcp_agent_%' THEN
            -- These agents must have tools configuration
            IF NOT (NEW.config_data ? 'tools') THEN
                RAISE EXCEPTION 'Admin config for % must include tools configuration', NEW.config_key;
            END IF;
        END IF;

        -- Provider tools agent requires systemPrompt at top level
        IF NEW.config_key LIKE 'provider_tools_agent_%' THEN
            IF NOT (NEW.config_data ? 'systemPrompt') THEN
                RAISE EXCEPTION 'Admin config for % must include systemPrompt', NEW.config_key;
            END IF;
        END IF;

        -- Chat Model Agent specific validation
        IF NEW.config_key LIKE 'chat_model_agent_%' THEN
            -- Chat Model Agent must have capabilities with fileInput
            IF NOT (NEW.config_data ? 'capabilities') THEN
                RAISE EXCEPTION 'Chat Model Agent must include capabilities for %', NEW.config_key;
            END IF;

            IF NOT (NEW.config_data->'capabilities' ? 'fileInput') THEN
                RAISE EXCEPTION 'Chat Model Agent capabilities must include fileInput for %', NEW.config_key;
            END IF;

            IF NOT (NEW.config_data ? 'tools') THEN
                RAISE EXCEPTION 'Chat Model Agent must include tools configuration for %', NEW.config_key;
            END IF;
        END IF;

        -- NOTE: availableModels validation removed - models are now stored in model_config table
        
    -- Legacy agent validation (for backward compatibility)
    ELSIF NEW.config_key LIKE '%_agent_%' THEN
        -- All legacy agent configs must have systemPrompt and rateLimit
        IF NOT (NEW.config_data ? 'systemPrompt') THEN
            RAISE EXCEPTION 'Admin config for % must include systemPrompt', NEW.config_key;
        END IF;
        
        IF NOT (NEW.config_data ? 'rateLimit') THEN
            RAISE EXCEPTION 'Admin config for % must include rateLimit', NEW.config_key;
        END IF;
        
        -- Validate legacy rateLimit structure - support both old and new formats
        -- New format: { "hourly": { "type": "hourly", "value": 50 }, "daily": { "type": "daily", "value": 100 } }
        -- Old format: { "type": "hourly", "value": 50 }
        IF NEW.config_data->'rateLimit' ? 'hourly' AND NEW.config_data->'rateLimit' ? 'daily' THEN
            -- New format validation
            IF NOT (NEW.config_data->'rateLimit'->'hourly' ? 'type') OR 
               NOT (NEW.config_data->'rateLimit'->'hourly' ? 'value') OR
               NOT (NEW.config_data->'rateLimit'->'daily' ? 'type') OR 
               NOT (NEW.config_data->'rateLimit'->'daily' ? 'value') THEN
                RAISE EXCEPTION 'rateLimit hourly and daily must include type and value for %', NEW.config_key;
            END IF;
            
            -- Validate types
            IF NEW.config_data->'rateLimit'->'hourly'->>'type' != 'hourly' OR
               NEW.config_data->'rateLimit'->'daily'->>'type' != 'daily' THEN
                RAISE EXCEPTION 'rateLimit hourly type must be "hourly" and daily type must be "daily" for %', NEW.config_key;
            END IF;
        ELSE
            -- Old format validation (backward compatibility)
            IF NOT (NEW.config_data->'rateLimit' ? 'type') OR 
               NOT (NEW.config_data->'rateLimit' ? 'value') THEN
                RAISE EXCEPTION 'rateLimit must include type and value for %', NEW.config_key;
            END IF;
            
            -- Validate rateLimit type
            IF NEW.config_data->'rateLimit'->>'type' NOT IN ('hourly', 'daily') THEN
                RAISE EXCEPTION 'rateLimit type must be hourly or daily for %', NEW.config_key;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;