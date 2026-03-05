-- =============================================================================
-- Bricks — local development seed data
-- Run via: supabase db reset
--
-- Demo accounts (all password: Password1!)
--   admin@bricks.local     → admin role
--   architect@bricks.local → architect role
--   engineer@bricks.local  → civil_engineer role
--   carpenter@bricks.local → carpenter role
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Stable UUIDs (used across all inserts for FK consistency)
-- ---------------------------------------------------------------------------
-- Users
-- U_ADMIN    = 00000000-0000-0000-0000-000000000001
-- U_ARCH     = 00000000-0000-0000-0000-000000000002
-- U_ENG      = 00000000-0000-0000-0000-000000000003
-- U_CARP     = 00000000-0000-0000-0000-000000000004
-- Org
-- ORG_1      = 00000000-0000-0000-0000-000000000010
-- Projects
-- PROJ_1     = 00000000-0000-0000-0000-000000000020
-- PROJ_2     = 00000000-0000-0000-0000-000000000021
-- Documents (project 1)
-- DOC_1      = 00000000-0000-0000-0000-000000000030  approved
-- DOC_2      = 00000000-0000-0000-0000-000000000031  in_review
-- DOC_3      = 00000000-0000-0000-0000-000000000032  changes_requested
-- DOC_4      = 00000000-0000-0000-0000-000000000033  draft
-- DOC_5      = 00000000-0000-0000-0000-000000000034  submitted
-- Documents (project 2)
-- DOC_6      = 00000000-0000-0000-0000-000000000035  draft
-- Document versions
-- VER_1..6   = 00000000-0000-0000-0000-0000000000A1..A6

-- ---------------------------------------------------------------------------
-- 1. Auth users
-- crypt() requires pgcrypto (enabled by default in Supabase local)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@bricks.local',
    crypt('Password1!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alex Admin"}',
    false, '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'architect@bricks.local',
    crypt('Password1!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Anna Architect"}',
    false, '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'engineer@bricks.local',
    crypt('Password1!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Erik Engineer"}',
    false, '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'carpenter@bricks.local',
    crypt('Password1!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Carl Carpenter"}',
    false, '', '', ''
  )
on conflict (id) do nothing;

-- Auth identities (required for email/password sign-in)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@bricks.local',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@bricks.local"}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'architect@bricks.local',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"architect@bricks.local"}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'engineer@bricks.local',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"engineer@bricks.local"}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    'carpenter@bricks.local',
    '{"sub":"00000000-0000-0000-0000-000000000004","email":"carpenter@bricks.local"}'::jsonb,
    'email', now(), now(), now()
  )
on conflict (provider, provider_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Profiles
-- The handle_new_user trigger creates the profiles row on auth.users insert.
-- We UPDATE to set display names and language preferences.
-- ---------------------------------------------------------------------------
update public.profiles set full_name = 'Alex Admin',      language = 'no' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set full_name = 'Anna Architect',  language = 'no' where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set full_name = 'Erik Engineer',   language = 'en' where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set full_name = 'Carl Carpenter',  language = 'no' where id = '00000000-0000-0000-0000-000000000004';

-- ---------------------------------------------------------------------------
-- 3. Organisation
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug, created_by)
values (
  '00000000-0000-0000-0000-000000000010',
  'Bricks Demo AS',
  'bricks-demo',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Projects
-- ---------------------------------------------------------------------------
insert into public.projects (id, organization_id, name, description, location, status, created_by)
values
  (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    'Kjøpmannsgata 12 — Renovation',
    'Full interior renovation of a 1960s commercial building in Trondheim city centre.',
    'Kjøpmannsgata 12, 7013 Trondheim',
    'active',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000010',
    'Storgata 7 — New Build',
    'Four-storey residential new build in central Oslo.',
    'Storgata 7, 0155 Oslo',
    'active',
    '00000000-0000-0000-0000-000000000001'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Project members
-- ---------------------------------------------------------------------------
insert into public.project_members (project_id, user_id, role, invited_by)
values
  -- Project 1: all four roles
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'admin',          null),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'architect',      '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000003', 'civil_engineer', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000004', 'carpenter',      '00000000-0000-0000-0000-000000000001'),
  -- Project 2: admin + architect only (tests scoped search / access)
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'admin',          null),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'architect',      '00000000-0000-0000-0000-000000000001')
on conflict (project_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Documents
-- The tsvector trigger fires on INSERT so search_vector is auto-populated.
-- ---------------------------------------------------------------------------
insert into public.documents (id, project_id, title, description, status, created_by, created_at, updated_at)
values
  -- Project 1
  (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000020',
    'Foundation Inspection Report',
    'Structural inspection of the existing foundation prior to renovation works.',
    'approved',
    '00000000-0000-0000-0000-000000000002',
    now() - interval '14 days',
    now() - interval '7 days'
  ),
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000020',
    'Structural Load Calculations',
    'Engineering calculations for load-bearing walls and new steel beams.',
    'in_review',
    '00000000-0000-0000-0000-000000000002',
    now() - interval '10 days',
    now() - interval '3 days'
  ),
  (
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000020',
    'Fire Safety Plan',
    'Evacuation routes, fire suppression equipment placement, and emergency lighting.',
    'changes_requested',
    '00000000-0000-0000-0000-000000000002',
    now() - interval '8 days',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000020',
    'Electrical Layout Draft',
    'Preliminary layout of electrical panels, conduits, and socket positions.',
    'draft',
    '00000000-0000-0000-0000-000000000002',
    now() - interval '5 days',
    now() - interval '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000020',
    'Roof Membrane Specification',
    'Material specification and installation method for the new TPO roof membrane.',
    'submitted',
    '00000000-0000-0000-0000-000000000002',
    now() - interval '20 days',
    now() - interval '10 days'
  ),
  -- Project 2
  (
    '00000000-0000-0000-0000-000000000035',
    '00000000-0000-0000-0000-000000000021',
    'Site Survey Report',
    'Topographic survey and soil analysis for the Storgata 7 plot.',
    'draft',
    '00000000-0000-0000-0000-000000000002',
    now() - interval '3 days',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Document versions (rich-text, one version per document)
-- ---------------------------------------------------------------------------
insert into public.document_versions
  (id, document_id, version_number, content_type, rich_text_json, created_by)
values
  (
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000030',
    1, 'rich_text',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Foundation Inspection Report"}]},{"type":"paragraph","content":[{"type":"text","text":"Inspection conducted on 12 February 2026. The existing concrete foundation shows no signs of cracking or differential settlement. Load-bearing capacity is estimated at 200 kN/m², which exceeds the required 150 kN/m² for the planned renovation."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Findings"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"No visible cracks in the perimeter foundation walls."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Drainage is adequate; no signs of moisture ingress."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Foundation depth confirmed at 1.2 m below finished floor level."}]}]}]},{"type":"paragraph","content":[{"type":"text","text":"Conclusion: The foundation is suitable for the planned renovation. No remedial works are required."}]}]}'::jsonb,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-000000000031',
    1, 'rich_text',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Structural Load Calculations"}]},{"type":"paragraph","content":[{"type":"text","text":"This document presents the structural calculations for the proposed steel beam installation on floors 2 and 3 of Kjøpmannsgata 12."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Design Loads"}]},{"type":"paragraph","content":[{"type":"text","text":"Dead load: 4.0 kN/m². Live load: 3.0 kN/m² (office use, per NS-EN 1991-1-1). Wind load calculated per NS-EN 1991-1-4 for Trondheim wind zone 2."}]},{"type":"paragraph","content":[{"type":"text","text":"The primary steel beam (HEB 240) spanning 6.2 m satisfies ULS and SLS requirements with a utilisation ratio of 0.87."}]}]}'::jsonb,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-000000000032',
    1, 'rich_text',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Fire Safety Plan"}]},{"type":"paragraph","content":[{"type":"text","text":"This plan defines the passive and active fire protection measures for Kjøpmannsgata 12 in compliance with TEK17 chapter 11 and NS 3901."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Evacuation Routes"}]},{"type":"paragraph","content":[{"type":"text","text":"Two independent evacuation staircases are provided, each with a maximum travel distance of 25 m to an exit. Staircases are enclosed with EI 60 fire-rated walls and self-closing doors."}]},{"type":"paragraph","content":[{"type":"text","text":"Note: Emergency lighting specifications are pending supplier confirmation. This section requires revision before approval."}]}]}'::jsonb,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '00000000-0000-0000-0000-0000000000a4',
    '00000000-0000-0000-0000-000000000033',
    1, 'rich_text',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Electrical Layout Draft"}]},{"type":"paragraph","content":[{"type":"text","text":"Preliminary electrical layout for the renovation of floors 1–3. This draft is subject to review by the certified electrician before submission."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Main Distribution Board"}]},{"type":"paragraph","content":[{"type":"text","text":"A new 3-phase 400A main distribution board will be installed in the basement plant room. Sub-distribution boards on each floor rated at 63A."}]}]}'::jsonb,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '00000000-0000-0000-0000-0000000000a5',
    '00000000-0000-0000-0000-000000000034',
    1, 'rich_text',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Roof Membrane Specification"}]},{"type":"paragraph","content":[{"type":"text","text":"Specification for the replacement roof membrane on the flat roof section (approx. 420 m²) of Kjøpmannsgata 12."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Selected System"}]},{"type":"paragraph","content":[{"type":"text","text":"Sika Sarnafil S 327-15 EL mechanically fastened TPO membrane, 1.5 mm thickness, with 100 mm mineral wool insulation (λ = 0.036 W/mK). System achieves U-value of 0.18 W/m²K, meeting TEK17 energy requirements."}]}]}'::jsonb,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-000000000035',
    1, 'rich_text',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Site Survey Report"}]},{"type":"paragraph","content":[{"type":"text","text":"Topographic survey of Storgata 7, Oslo, conducted 28 February 2026."}]},{"type":"paragraph","content":[{"type":"text","text":"The plot measures 18.4 m × 32.1 m (591 m²). Ground level is approximately 2.3 m above sea level. Soil classification: moraine with good bearing capacity. No groundwater encountered above 4.5 m depth."}]}]}'::jsonb,
    '00000000-0000-0000-0000-000000000002'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Link documents to their current version
-- ---------------------------------------------------------------------------
update public.documents set current_version_id = '00000000-0000-0000-0000-0000000000a1' where id = '00000000-0000-0000-0000-000000000030';
update public.documents set current_version_id = '00000000-0000-0000-0000-0000000000a2' where id = '00000000-0000-0000-0000-000000000031';
update public.documents set current_version_id = '00000000-0000-0000-0000-0000000000a3' where id = '00000000-0000-0000-0000-000000000032';
update public.documents set current_version_id = '00000000-0000-0000-0000-0000000000a4' where id = '00000000-0000-0000-0000-000000000033';
update public.documents set current_version_id = '00000000-0000-0000-0000-0000000000a5' where id = '00000000-0000-0000-0000-000000000034';
update public.documents set current_version_id = '00000000-0000-0000-0000-0000000000a6' where id = '00000000-0000-0000-0000-000000000035';

-- ---------------------------------------------------------------------------
-- 9. Document status history (transitions for non-draft documents)
-- ---------------------------------------------------------------------------
insert into public.document_status_history (document_id, from_status, to_status, changed_by, note)
values
  -- Foundation Report: draft → in_review → approved
  ('00000000-0000-0000-0000-000000000030', 'draft',      'in_review', '00000000-0000-0000-0000-000000000002', null),
  ('00000000-0000-0000-0000-000000000030', 'in_review',  'approved',  '00000000-0000-0000-0000-000000000003', 'All structural requirements confirmed. Approved.'),
  -- Structural Load: draft → in_review
  ('00000000-0000-0000-0000-000000000031', 'draft',      'in_review', '00000000-0000-0000-0000-000000000002', null),
  -- Fire Safety Plan: draft → in_review → changes_requested
  ('00000000-0000-0000-0000-000000000032', 'draft',      'in_review',           '00000000-0000-0000-0000-000000000002', null),
  ('00000000-0000-0000-0000-000000000032', 'in_review',  'changes_requested',   '00000000-0000-0000-0000-000000000003', 'Emergency lighting specifications are missing. Please add supplier data sheet and confirm lux levels meet NS-EN 1838.'),
  -- Roof Membrane: draft → in_review → approved → submitted
  ('00000000-0000-0000-0000-000000000034', 'draft',      'in_review', '00000000-0000-0000-0000-000000000002', null),
  ('00000000-0000-0000-0000-000000000034', 'in_review',  'approved',  '00000000-0000-0000-0000-000000000003', 'Specification meets TEK17. Approved.'),
  ('00000000-0000-0000-0000-000000000034', 'approved',   'submitted', '00000000-0000-0000-0000-000000000001', null)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 10. Comments
-- ---------------------------------------------------------------------------
insert into public.comments (id, document_version_id, created_by, body)
values
  (
    '00000000-0000-0000-0000-000000000050',
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000003',
    'Reviewed. The foundation capacity figures are consistent with the geotechnical report from 2024. No concerns.'
  ),
  (
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000002',
    'Thanks @Erik. I have also confirmed the drainage gradient meets the municipality requirements.'
  ),
  (
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-000000000003',
    'The utilisation ratio of 0.87 is within acceptable limits but leaves little margin. Please verify the load combination for snow + wind per NS-EN 1990.'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 11. Compliance check (completed, for the approved Foundation Report)
-- ---------------------------------------------------------------------------
insert into public.compliance_checks (id, document_version_id, status, model, duration_ms, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000060',
  '00000000-0000-0000-0000-0000000000a1',
  'complete',
  'claude-sonnet-4-6',
  4823,
  now() - interval '13 days',
  now() - interval '13 days'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 12. Integration (inactive outbound webhook on Project 1)
-- webhook_secret_enc uses a placeholder value — the integration is inactive
-- so it will never be decrypted. Format: hex(iv):hex(tag):hex(ciphertext)
-- ---------------------------------------------------------------------------
insert into public.integrations (id, project_id, name, type, webhook_url, webhook_secret_enc, status, created_by)
values (
  '00000000-0000-0000-0000-000000000070',
  '00000000-0000-0000-0000-000000000020',
  'Demo Webhook (inactive)',
  'webhook_outbound',
  'https://example.com/bricks-webhook',
  '000000000000000000000000:00000000000000000000000000000000:00',
  'inactive',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 13. Notifications (a few pre-seeded so the bell is not empty on first login)
-- ---------------------------------------------------------------------------
insert into public.notifications (user_id, type, title, body, link)
values
  -- Notify architect that engineer approved the Foundation Report
  (
    '00000000-0000-0000-0000-000000000002',
    'status_change',
    '"Foundation Inspection Report" was approved',
    'Erik Engineer approved the document.',
    '/app/projects/00000000-0000-0000-0000-000000000020/documents/00000000-0000-0000-0000-000000000030'
  ),
  -- Notify architect that changes were requested on Fire Safety Plan
  (
    '00000000-0000-0000-0000-000000000002',
    'status_change',
    'Changes requested on "Fire Safety Plan"',
    'Erik Engineer requested changes: Emergency lighting specifications are missing.',
    '/app/projects/00000000-0000-0000-0000-000000000020/documents/00000000-0000-0000-0000-000000000032'
  ),
  -- Notify engineer that Structural Load Calculations are ready for review
  (
    '00000000-0000-0000-0000-000000000003',
    'status_change',
    '"Structural Load Calculations" is ready for review',
    'Anna Architect submitted the document for review.',
    '/app/projects/00000000-0000-0000-0000-000000000020/documents/00000000-0000-0000-0000-000000000031'
  ),
  -- Notify architect of Erik''s comment mentioning them
  (
    '00000000-0000-0000-0000-000000000002',
    'mention',
    'Erik Engineer mentioned you in a comment',
    'Thanks @Erik. I have also confirmed the drainage gradient...',
    '/app/projects/00000000-0000-0000-0000-000000000020/documents/00000000-0000-0000-0000-000000000030'
  );
