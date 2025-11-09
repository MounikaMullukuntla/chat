import { config } from "dotenv";
import postgres from "postgres";

config({
  path: ".env.local",
});

interface VerificationResult {
  category: string;
  passed: boolean;
  details: string[];
}

const verifyMigration = async (): Promise<void> => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const results: VerificationResult[] = [];

  console.log("🔍 Starting Database Verification...");
  console.log("");

  try {
    // 1. Verify Tables
    console.log("Checking tables...");
    const expectedTables = [
      "Chat",
      "Message_v2",
      "Vote_v2",
      "Document",
      "Suggestion",
      "Stream",
      "admin_config",
      "model_config",
      "usage_logs",
      "rate_limit_tracking",
      "github_repositories",
      "error_logs"
    ];

    const tableResult: VerificationResult = {
      category: "Tables",
      passed: true,
      details: []
    };

    for (const table of expectedTables) {
      try {
        const result = await connection`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          )
        `;
        
        if (!result[0]?.exists) {
          tableResult.passed = false;
          tableResult.details.push(`❌ Table "${table}" is missing`);
        }
      } catch (error) {
        tableResult.passed = false;
        tableResult.details.push(`❌ Error checking table "${table}": ${error}`);
      }
    }

    if (tableResult.passed && tableResult.details.length === 0) {
      tableResult.details.push("✅ All expected tables exist");
    }
    results.push(tableResult);

    // 2. Verify Functions
    console.log("Checking functions...");
    const expectedFunctions = [
      "get_user_role",
      "validate_user_id",
      "handle_auth_user_deletion",
      "get_current_user_usage_summary",
      "is_current_user_admin",
      "update_admin_config_timestamp",
      "update_model_config_timestamp",
      "ensure_single_default_model_per_provider",
      "validate_admin_config_data"
    ];

    const functionResult: VerificationResult = {
      category: "Functions",
      passed: true,
      details: []
    };

    for (const func of expectedFunctions) {
      try {
        const result = await connection`
          SELECT EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = ${func}
          )
        `;
        
        if (!result[0]?.exists) {
          functionResult.passed = false;
          functionResult.details.push(`❌ Function "${func}" is missing`);
        }
      } catch (error) {
        functionResult.passed = false;
        functionResult.details.push(`❌ Error checking function "${func}": ${error}`);
      }
    }

    if (functionResult.passed && functionResult.details.length === 0) {
      functionResult.details.push("✅ All expected functions exist");
    }
    results.push(functionResult);

    // 3. Verify Indexes
    console.log("Checking indexes...");
    const expectedIndexes = [
      "idx_chat_user_id",
      "idx_chat_user_created",
      "idx_message_chat",
      "idx_document_user_id",
      "idx_usage_logs_user_id",
      "idx_usage_logs_user_timestamp",
      "idx_rate_limit_user_agent",
      "idx_github_repos_user_id",
      "idx_error_logs_user_id",
      "idx_admin_config_key",
      "idx_model_config_model_id",
      "idx_model_config_provider"
    ];

    const indexResult: VerificationResult = {
      category: "Indexes",
      passed: true,
      details: []
    };

    for (const index of expectedIndexes) {
      try {
        const result = await connection`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = ${index}
          )
        `;
        
        if (!result[0]?.exists) {
          indexResult.passed = false;
          indexResult.details.push(`❌ Index "${index}" is missing`);
        }
      } catch (error) {
        indexResult.passed = false;
        indexResult.details.push(`❌ Error checking index "${index}": ${error}`);
      }
    }

    if (indexResult.passed && indexResult.details.length === 0) {
      indexResult.details.push("✅ All expected indexes exist");
    }
    results.push(indexResult);

    // 4. Verify Triggers
    console.log("Checking triggers...");
    const expectedTriggers = [
      { table: "Chat", trigger: "validate_chat_user_id" },
      { table: "Document", trigger: "validate_document_user_id" },
      { table: "admin_config", trigger: "trigger_admin_config_updated_at" },
      { table: "model_config", trigger: "trigger_model_config_updated_at" },
      { table: "model_config", trigger: "trigger_ensure_single_default_model" }
    ];

    const triggerResult: VerificationResult = {
      category: "Triggers",
      passed: true,
      details: []
    };

    for (const { table, trigger } of expectedTriggers) {
      try {
        const result = await connection`
          SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE event_object_schema = 'public' 
            AND event_object_table = ${table}
            AND trigger_name = ${trigger}
          )
        `;
        
        if (!result[0]?.exists) {
          triggerResult.passed = false;
          triggerResult.details.push(`❌ Trigger "${table}.${trigger}" is missing`);
        }
      } catch (error) {
        triggerResult.passed = false;
        triggerResult.details.push(`❌ Error checking trigger "${table}.${trigger}": ${error}`);
      }
    }

    if (triggerResult.passed && triggerResult.details.length === 0) {
      triggerResult.details.push("✅ All expected triggers exist");
    }
    results.push(triggerResult);

    // 5. Verify RLS Policies
    console.log("Checking RLS policies...");
    const expectedPolicies = [
      { table: "Chat", policy: "Users can read own chats" },
      { table: "admin_config", policy: "Admins can read admin_config" },
      { table: "model_config", policy: "Authenticated users can read model_config" },
      { table: "usage_logs", policy: "Users can read own usage_logs" },
      { table: "error_logs", policy: "System can insert error_logs" }
    ];

    const policyResult: VerificationResult = {
      category: "RLS Policies",
      passed: true,
      details: []
    };

    for (const { table, policy } of expectedPolicies) {
      try {
        const result = await connection`
          SELECT EXISTS (
            SELECT FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = ${table}
            AND policyname = ${policy}
          )
        `;
        
        if (!result[0]?.exists) {
          policyResult.passed = false;
          policyResult.details.push(`❌ Policy "${policy}" missing on "${table}"`);
        }
      } catch (error) {
        policyResult.passed = false;
        policyResult.details.push(`❌ Error checking policy "${policy}" on "${table}": ${error}`);
      }
    }

    if (policyResult.passed && policyResult.details.length === 0) {
      policyResult.details.push("✅ All expected RLS policies exist");
    }
    results.push(policyResult);

    // 6. Verify Seed Data
    console.log("Checking seed data...");
    const seedResult: VerificationResult = {
      category: "Seed Data",
      passed: true,
      details: []
    };

    try {
      const configCount = await connection`
        SELECT COUNT(*) as count FROM admin_config
      `;
      
      const count = parseInt(configCount[0]?.count || "0");
      if (count === 0) {
        seedResult.passed = false;
        seedResult.details.push("❌ No admin configurations found");
      } else {
        seedResult.details.push(`✅ Found ${count} admin configurations`);
        
        // Check for app_settings
        const appSettings = await connection`
          SELECT EXISTS (
            SELECT FROM admin_config 
            WHERE config_key = 'app_settings'
          )
        `;
        
        if (appSettings[0]?.exists) {
          seedResult.details.push("✅ App settings configuration exists");
        } else {
          seedResult.passed = false;
          seedResult.details.push("❌ App settings configuration missing");
        }

        // Check for provider configs
        const googleConfigs = await connection`
          SELECT COUNT(*) as count FROM admin_config
          WHERE config_key LIKE '%_google'
        `;

        const googleCount = parseInt(googleConfigs[0]?.count || "0");
        seedResult.details.push(`✅ Found ${googleCount} Google provider configurations`);

        // Verify document_agent_google has new structure
        const documentAgentConfig = await connection`
          SELECT config_data FROM admin_config
          WHERE config_key = 'document_agent_google'
        `;

        if (documentAgentConfig.length > 0) {
          const configData = documentAgentConfig[0].config_data as any;

          // Check for new prompts structure
          if (configData.prompts && configData.prompts.createDocument && configData.prompts.updateDocument) {
            seedResult.details.push("✅ Document agent has new prompts structure");
          } else {
            seedResult.passed = false;
            seedResult.details.push("❌ Document agent missing new prompts structure");
          }

          // Check that old systemPrompt is removed (should not exist)
          if (configData.systemPrompt) {
            seedResult.details.push("⚠️  Document agent still has old systemPrompt (should be removed)");
          }

          // Check that old tools are removed
          if (configData.tools && Object.keys(configData.tools).length > 0) {
            seedResult.details.push("⚠️  Document agent still has old tools structure (should be removed)");
          }
        }

        // Verify chat_model_agent_google has new documentAgent tool structure
        const chatAgentConfig = await connection`
          SELECT config_data FROM admin_config
          WHERE config_key = 'chat_model_agent_google'
        `;

        if (chatAgentConfig.length > 0) {
          const configData = chatAgentConfig[0].config_data as any;

          if (configData.tools?.documentAgent?.tool_input?.operation &&
              configData.tools?.documentAgent?.tool_input?.instruction) {
            seedResult.details.push("✅ Chat agent has new documentAgent tool structure (operation + instruction)");
          } else {
            seedResult.passed = false;
            seedResult.details.push("❌ Chat agent missing new documentAgent tool structure");
          }
        }
      }
    } catch (error) {
      seedResult.passed = false;
      seedResult.details.push(`❌ Error checking seed data: ${error}`);
    }

    // Check model_config seed data
    try {
      const modelCount = await connection`
        SELECT COUNT(*) as count FROM model_config
      `;

      const count = parseInt(modelCount[0]?.count || "0");
      if (count === 0) {
        seedResult.passed = false;
        seedResult.details.push("❌ No model configurations found");
      } else {
        seedResult.details.push(`✅ Found ${count} model configurations`);

        // Check for each provider
        const googleModels = await connection`
          SELECT COUNT(*) as count FROM model_config WHERE provider = 'google'
        `;
        const openaiModels = await connection`
          SELECT COUNT(*) as count FROM model_config WHERE provider = 'openai'
        `;
        const anthropicModels = await connection`
          SELECT COUNT(*) as count FROM model_config WHERE provider = 'anthropic'
        `;

        seedResult.details.push(`✅ Google models: ${googleModels[0]?.count || 0}`);
        seedResult.details.push(`✅ OpenAI models: ${openaiModels[0]?.count || 0}`);
        seedResult.details.push(`✅ Anthropic models: ${anthropicModels[0]?.count || 0}`);
      }
    } catch (error) {
      seedResult.passed = false;
      seedResult.details.push(`❌ Error checking model_config data: ${error}`);
    }

    results.push(seedResult);

  } catch (error) {
    console.error("❌ Verification failed:", error);
    throw error;
  } finally {
    await connection.end();
  }

  // Print Results
  console.log("");
  console.log("============================================================");
  console.log("📊 VERIFICATION RESULTS");
  console.log("============================================================");
  console.log("");

  let allPassed = true;

  for (const result of results) {
    const status = result.passed ? "✅ PASSED" : "❌ FAILED";
    console.log(`${status} - ${result.category}`);
    console.log("------------------------------------------------------------");
    
    for (const detail of result.details) {
      console.log(`  ${detail}`);
    }
    console.log("");
    
    if (!result.passed) {
      allPassed = false;
    }
  }

  console.log("============================================================");
  if (allPassed) {
    console.log("✅ ALL CHECKS PASSED - Database is ready!");
  } else {
    console.log("❌ SOME CHECKS FAILED - Please review errors above");
  }
  console.log("============================================================");
  console.log("");

  if (!allPassed) {
    throw new Error("Database verification failed");
  }
};

if (require.main === module) {
  verifyMigration().catch((err) => {
    console.error("❌ Verification failed:", err.message);
    process.exit(1);
  });
}

export { verifyMigration };