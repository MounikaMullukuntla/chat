# Prompt Static Port

This folder tracks the work needed to maintain a static JavaScript version of the chat prompt input UI while keeping the Next.js version as the source of truth.

Scope: everything inside the rounded prompt container from the chat app, including:

- The `Send a message...` textarea
- The attachment icon and upload flow
- The GitHub icon and GitHub context flow
- The model selector
- The thinking toggle
- The right-side action buttons inside the rounded prompt box:
  the up-arrow submit button and the alternate stop/status button

The upstream implementation currently lives in:

- [chat/components/multimodal-input.tsx](/Users/Loren/Documents/webroot/chat/components/multimodal-input.tsx:45)
- [chat/components/elements/prompt-input.tsx](/Users/Loren/Documents/webroot/chat/components/elements/prompt-input.tsx:24)
- [chat/components/model-selector.tsx](/Users/Loren/Documents/webroot/chat/components/model-selector.tsx:34)
- [chat/components/conditional-file-input.tsx](/Users/Loren/Documents/webroot/chat/components/conditional-file-input.tsx:19)
- [chat/components/thinking-mode-toggle.tsx](/Users/Loren/Documents/webroot/chat/components/thinking-mode-toggle.tsx:16)
- [chat/lib/github-components/github-repo-modal.tsx](/Users/Loren/Documents/webroot/chat/lib/github-components/github-repo-modal.tsx:29)

## Goal

Provide a static embeddable prompt widget under `chat/prompt/` that can run without Next.js or React, while preserving the same user-facing behavior as the chat app wherever practical.

The static version should be treated as a maintained port, not an unrelated rewrite.

## Source Of Truth

The Next.js prompt remains the canonical implementation.

The static prompt should mirror:

1. Structure and visual hierarchy.
2. Interaction behavior.
3. Storage keys and payload shape where feasible.
4. API contracts used by the prompt box.

When behavior differs, the deviation should be documented in this file.

## Upstream Feature Map

### 1. Prompt shell and textarea

The rounded container, form submission behavior, and Enter-vs-Shift+Enter behavior are defined in [chat/components/elements/prompt-input.tsx](/Users/Loren/Documents/webroot/chat/components/elements/prompt-input.tsx:24).

Key details to preserve:

- Outer form uses `rounded-xl`, border, background, and shadow.
- Textarea submits on `Enter`.
- `Shift+Enter` inserts a newline.
- IME composition must not trigger submission.
- Textarea stays visually minimal inside the rounded shell.

### 2. Prompt state and submission payload

The orchestration logic is in [chat/components/multimodal-input.tsx](/Users/Loren/Documents/webroot/chat/components/multimodal-input.tsx:276).

Key details to preserve:

- Empty prompt + no attachments does not submit.
- Attachments are converted into `parts` entries before the text part.
- GitHub context modifies both visible prompt composition and `experimental_providerMetadata.github`.
- Thinking mode is attached as `experimental_providerMetadata.thinking`.
- Input is cleared after successful submit.

### 3. Attachment button and upload flow

Attachment visibility and validation start in [chat/components/conditional-file-input.tsx](/Users/Loren/Documents/webroot/chat/components/conditional-file-input.tsx:27) and [chat/components/multimodal-input.tsx](/Users/Loren/Documents/webroot/chat/components/multimodal-input.tsx:390).

Key details to preserve:

- Attachment button only appears when provider config allows file input.
- Selected files are validated against provider-level allowed file types.
- Upload uses `POST /api/files/upload`.
- Removal uses `DELETE /api/files/delete`.
- Upload queue shows pending items before upload completes.

### 4. GitHub button and context flow

The button, session persistence, and message metadata are in [chat/components/multimodal-input.tsx](/Users/Loren/Documents/webroot/chat/components/multimodal-input.tsx:102), [chat/components/multimodal-input.tsx](/Users/Loren/Documents/webroot/chat/components/multimodal-input.tsx:299), and [chat/components/multimodal-input.tsx](/Users/Loren/Documents/webroot/chat/components/multimodal-input.tsx:687).

The current modal implementation is in [chat/lib/github-components/github-repo-modal.tsx](/Users/Loren/Documents/webroot/chat/lib/github-components/github-repo-modal.tsx:77).

Key details to preserve:

- GitHub selections persist in `sessionStorage` using the `chatId`.
- The button shows a badge count when repos/files/folders are selected.
- Current Next.js behavior opens the sidebar Sources panel via `open-github-sources`.
- Selected items render as removable chips below the textarea.
- Submitted message includes both human-readable GitHub context text and structured metadata.

Important note:
The current `showGitHubModal` state exists, but the visible GitHub button dispatches a sidebar event rather than opening the modal directly. The static port needs an explicit decision here:

- Option A: reproduce the current sidebar-driven behavior.
- Option B: use an embedded modal inside `chat/prompt`.

Until decided otherwise, the static port should prefer Option B because a standalone embeddable widget cannot assume the Next.js sidebar exists.

### 5. Model selector

The current model picker is in [chat/components/model-selector.tsx](/Users/Loren/Documents/webroot/chat/components/model-selector.tsx:34).

Key details to preserve:

- Reads configured browser keys from local storage.
- Reads server-side key presence from `/api/server-keys`.
- Groups models by provider.
- Routes user to settings when a provider has no key.
- Saves selected model using the `chat-model` cookie action in Next.js.
- Shows DB fallback status and provider/model availability messaging.

For the static port, the cookie action cannot be reused directly. The static version should instead:

- Persist the selected model locally.
- Match the same model IDs.
- Use the same provider-key gating logic.
- Optionally expose a hook so host pages can sync the selection back to a server.

### 6. Thinking toggle

Thinking support is in [chat/components/thinking-mode-toggle.tsx](/Users/Loren/Documents/webroot/chat/components/thinking-mode-toggle.tsx:23).

Key details to preserve:

- Only show the toggle when the current model supports thinking mode.
- Persist the toggle in local storage using `thinking-mode`.
- Include `thinking: true` in provider metadata only when both enabled and supported.

### 7. Right-side action button

The submit/stop behavior is in [chat/components/multimodal-input.tsx](/Users/Loren/Documents/webroot/chat/components/multimodal-input.tsx:763) and [chat/components/elements/prompt-input.tsx](/Users/Loren/Documents/webroot/chat/components/elements/prompt-input.tsx:155).

Key details to preserve:

- Ready state shows the circular up-arrow submit button.
- Submitted/streaming state swaps to the stop button.
- Disabled state applies when there is no input and no attachments, or while uploads are pending.
- Status icon behavior should remain aligned with the upstream semantics.

## Static Port Boundaries

The static implementation should split into two layers:

### Layer 1: portable prompt UI

Files to create in this folder:

- `index.html`
- `prompt.css`
- `prompt.js`

Responsibilities:

- Render the prompt shell.
- Manage local UI state.
- Read/write local and session storage.
- Call JSON and upload endpoints.
- Emit events to a host page.

### Layer 2: host integration adapter

The static prompt should not hardcode Next.js assumptions. Instead it should accept configuration such as:

- `serverKeysUrl`
- `modelCapabilitiesUrl`
- `uploadUrl`
- `deleteUploadUrl`
- `githubTokenUrl`
- `submitHandler`
- `openGitHubPicker`

This keeps the widget usable in:

- standalone static pages
- `requests/*` pages
- `localsite/*` pages
- the chat server running on `8888`

## Required Shared Contracts

The static version should stay aligned with these data contracts:

### Storage

- `thinking-mode`
- `input`
- `settings_api-keys`
- `github-repos-${chatId}`
- `github-files-${chatId}`
- `github-folders-${chatId}`

### APIs

- `GET /api/server-keys`
- `GET /api/models/capabilities`
- `POST /api/files/upload`
- `DELETE /api/files/delete`
- `GET /api/github-token` when GitHub PAT fallback is needed

### Message payload

The static port should build the same user message shape used by `sendMessage`:

```json
{
  "role": "user",
  "parts": [
    { "type": "file", "url": "...", "name": "...", "mediaType": "..." },
    { "type": "text", "text": "..." }
  ],
  "experimental_providerMetadata": {
    "thinking": true,
    "github": {
      "repos": [],
      "files": [],
      "folders": []
    }
  }
}
```

## Planned Differences From Next.js

These differences are expected unless we explicitly eliminate them:

1. No React state or hooks.
2. No Next.js router or server actions.
3. No Radix UI components.
4. No shadcn component imports.
5. No implicit sidebar integration.

Where possible, behavior should match even if implementation details differ.

## Initial Port Plan

### Phase 1: static shell parity

- Recreate the rounded prompt container and textarea.
- Recreate Enter submit and Shift+Enter newline behavior.
- Recreate the right-side submit/stop button behavior.

### Phase 2: model and thinking parity

- Fetch model capabilities.
- Rebuild provider/model grouping.
- Rebuild key gating against browser keys and `/api/server-keys`.
- Rebuild the thinking toggle visibility rules.

### Phase 3: attachments parity

- Add hidden file input.
- Add validation based on provider config.
- Add upload queue UI.
- Add uploaded attachment chips and deletion flow.

### Phase 4: GitHub parity

- Add GitHub button.
- Add selected-item chips.
- Add a standalone GitHub picker UI or adapter hook.
- Preserve session storage and message metadata behavior.

### Phase 5: maintenance tooling

- Add a change checklist for upstream prompt changes.
- Add a smoke-test page under `chat/prompt/`.
- Add a short “how to update the static port” section.

## Maintenance Runbook

This section is the repeatable process for bringing prompt-box changes over from the Next.js Vercel parent repo into the static `chat/prompt` port.

Current repo assumptions:

- local chat repo remote: `origin`
- Vercel parent repo remote: `upstream`
- default branch for both: `main`

### Upstream files to watch

When the Next.js prompt changes, inspect these files first:

- [chat/components/multimodal-input.tsx](/Users/Loren/Documents/webroot/chat/components/multimodal-input.tsx:45)
- [chat/components/model-selector.tsx](/Users/Loren/Documents/webroot/chat/components/model-selector.tsx:34)
- [chat/components/conditional-file-input.tsx](/Users/Loren/Documents/webroot/chat/components/conditional-file-input.tsx:19)
- [chat/components/thinking-mode-toggle.tsx](/Users/Loren/Documents/webroot/chat/components/thinking-mode-toggle.tsx:16)
- [chat/components/elements/prompt-input.tsx](/Users/Loren/Documents/webroot/chat/components/elements/prompt-input.tsx:24)

Also inspect when relevant:

- [chat/lib/github-components/github-repo-modal.tsx](/Users/Loren/Documents/webroot/chat/lib/github-components/github-repo-modal.tsx:29)
- `chat/lib/github-components/*`
- `chat/hooks/use-model-capabilities.ts`
- `chat/lib/storage/*`
- `chat/app/(chat)/api/files/*`
- `chat/app/api/models/capabilities/route.ts`

### Recurring Sync Steps

Run these steps occasionally when you want to refresh the static port from the parent repo:

1. Fetch the latest upstream changes.

```bash
cd chat
git fetch upstream
```

2. Review upstream prompt-related changes since your last sync point.

```bash
git diff --stat upstream/main -- components/multimodal-input.tsx components/model-selector.tsx components/conditional-file-input.tsx components/thinking-mode-toggle.tsx components/elements/prompt-input.tsx lib/github-components
```

3. Read the actual diffs for behavior changes.

```bash
git diff upstream/main -- components/multimodal-input.tsx components/model-selector.tsx components/conditional-file-input.tsx components/thinking-mode-toggle.tsx components/elements/prompt-input.tsx
```

4. Classify each upstream change into one of these buckets:

- visual-only change
- interaction change
- storage change
- API contract change
- message payload change
- host-integration-only change

5. Apply only the changes that belong in the static prompt.

Rules:

- Copy visual and interaction changes whenever possible.
- Preserve storage key parity unless there is a strong static-only reason not to.
- Preserve API and payload parity unless the static host cannot support it.
- Do not copy Next.js-only concerns directly if they depend on React hooks, router navigation, server actions, or sidebar-only infrastructure.

6. Update the static files in `chat/prompt/`.

Expected target files:

- `chat/prompt/index.html`
- `chat/prompt/prompt.css`
- `chat/prompt/prompt.js`
- this `chat/prompt/README.md`

7. Record intentional differences in this document under `Open Decisions` or a future `Known Divergences` section.

8. Smoke test the static prompt against the same contracts:

- model loading
- key gating
- thinking visibility
- attachment validation
- attachment upload/delete
- GitHub selection persistence
- submit payload shape

### Sync Checklist

Use this checklist during each refresh:

- [ ] Compare UI structure and copy text
- [ ] Compare textarea submission behavior
- [ ] Compare attachment visibility and validation rules
- [ ] Compare upload and delete endpoints
- [ ] Compare GitHub selection behavior and badge counts
- [ ] Compare model selector grouping and gating rules
- [ ] Compare thinking toggle visibility logic
- [ ] Compare local/session storage keys and semantics
- [ ] Compare message payload shape
- [ ] Record intentional divergence in this document

### Maintenance Prompt

Use this prompt with an AI assistant when you want to run the refresh process:

```text
Update the static prompt port in chat/prompt from the Next.js prompt implementation in the chat repo.

Source of truth:
- chat/components/multimodal-input.tsx
- chat/components/model-selector.tsx
- chat/components/conditional-file-input.tsx
- chat/components/thinking-mode-toggle.tsx
- chat/components/elements/prompt-input.tsx
- chat/lib/github-components/github-repo-modal.tsx when GitHub behavior is relevant

Remote context:
- local repo remote is origin
- Vercel parent repo remote is upstream
- sync against upstream/main

Tasks:
1. Fetch upstream and inspect prompt-related diffs against upstream/main.
2. Summarize upstream changes that affect the static prompt.
3. Port the relevant behavior and UI changes into chat/prompt.
4. Preserve parity for storage keys, API contracts, and message payload shape where practical.
5. Keep Next.js-only infrastructure out of the static port unless adapted through host callbacks or config.
6. Update chat/prompt/README.md with any new divergences or maintenance notes.
7. Report what changed, what was intentionally not copied, and any follow-up work.
```

### What Not To Port Blindly

Do not copy these upstream patterns into the static port without adaptation:

- `useRouter()` navigation to `/settings`
- server actions like `saveChatModelAsCookie`
- React-only hooks such as `useEffect`, `useMemo`, `useState`, `useSWR`
- sidebar event coupling that assumes the chat app shell exists
- shadcn/Radix primitives as implementation dependencies

Instead:

- replace router navigation with a configurable host callback or settings URL
- replace server actions with local persistence or explicit API calls
- replace hook state with plain JavaScript state
- replace shell coupling with embeddable widget events

### Maintenance Output Expectations

A good sync run should end with:

1. Updated `chat/prompt/*` files when parity changes were needed.
2. An updated note in this README when upstream behavior changed or a divergence remains.
3. A short summary of:
   which upstream files changed,
   which changes were ported,
   which changes were skipped,
   and which items need manual follow-up.

## Known Divergences

- The static prompt is expected to use plain JavaScript instead of React.
- The static prompt should prefer host callbacks or local persistence over Next.js router and server-action behavior.
- GitHub source selection may use an embedded modal instead of the chat sidebar event flow.

## Open Decisions

- Should the static prompt open a standalone GitHub modal or require a host-provided GitHub browser?
- Should the static prompt submit directly to chat APIs or emit a `prompt-submit` event for host pages to handle?
- Should the model selector in static mode persist only locally, or also write a cookie to match the chat app?
- Should the static port copy the current chip UI for GitHub selections exactly, or simplify it for non-chat hosts?
- Should the static prompt include the usage/context indicator now provided by `Context`, or defer that to a later phase?

## Tracking Checklist

- [x] Create `chat/prompt/index.html`
- [x] Create `chat/prompt/prompt.css`
- [x] Create `chat/prompt/prompt.js`
- [ ] Extract a portable config contract for endpoints and host callbacks
- [x] Recreate textarea and submit behavior
- [x] Recreate model selector behavior
- [x] Recreate thinking toggle behavior
- [x] Recreate attachment validation and upload behavior
- [x] Recreate GitHub context selection behavior
- [x] Recreate selected attachment and GitHub chip UI
- [x] Add a standalone demo page
- [ ] Add parity notes for any deviations from Next.js

## Current Status

Status: initial static port created.

The first build now exists in:

- [chat/prompt/index.html](/Users/Loren/Documents/webroot/chat/prompt/index.html:1)
- [chat/prompt/prompt.css](/Users/Loren/Documents/webroot/chat/prompt/prompt.css:1)
- [chat/prompt/prompt.js](/Users/Loren/Documents/webroot/chat/prompt/prompt.js:1)

Current behavior:

- Uses plain JavaScript, local/session storage, and browser fetch.
- Preserves the prompt shell, textarea, attachment flow, model selector, thinking toggle, GitHub context chips, context ring, and submit/stop control.
- Includes a standalone GitHub modal instead of the chat sidebar event flow.
- Emits the same general prompt payload shape and supports a host `onSubmit` callback.
