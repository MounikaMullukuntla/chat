# Supabase Email Confirmation Setup

Step-by-step guide to enable email confirmation in Supabase Dashboard.

---

## Step 1: Navigate to Authentication Settings

1. Open your **Supabase Dashboard**
2. Select your project
3. Click **Authentication** in the left sidebar
4. Click **Providers** under the "CONFIGURATION" section

---

## Step 2: Enable Email Confirmation

1. In the **Auth Providers** section, locate **Email** in the providers list
2. Click on **Email** to expand the settings
3. Ensure **Email** is **Enabled** (toggle should be green/on)
4. Enable the **Confirm email** toggle
   - This setting requires users to verify their email address before they can sign in
   - Users will receive an activation email upon signing up

---

## Step 3: Save Changes

1. Click the **Save** button at the bottom of the page
2. Your email confirmation settings are now active

---

## What This Does

When **Confirm email** is enabled:
- New users who sign up will receive an email with a confirmation link
- Users cannot sign in until they click the confirmation link
- The confirmation link verifies the user's email address
- Once verified, users can sign in normally


![alt text](image.png)