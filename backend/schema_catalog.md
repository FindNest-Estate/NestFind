# Schema Catalog

## Tables Overview

- **admin_actions** (9 columns)
- **agent_assignments** (8 columns)
- **agent_crm_leads** (14 columns)
- **agent_marketing_profiles** (7 columns)
- **agent_profiles** (10 columns)
- **agent_schedule_events** (8 columns)
- **agent_verification_scores** (6 columns)
- **agreements** (17 columns)
- **audit_logs** (8 columns)
- **collection_items** (3 columns)
- **collections** (6 columns)
- **conversations** (6 columns)
- **deal_events** (10 columns)
- **deals** (28 columns)
- **dispute_evidence** (9 columns)
- **disputes** (22 columns)
- **duplicate_property_detection** (8 columns)
- **email_otp_verifications** (8 columns)
- **financial_ledgers** (10 columns)
- **ledger_entries** (12 columns)
- **marketing_history** (8 columns)
- **messages** (6 columns)
- **notification_intents** (13 columns)
- **notifications** (8 columns)
- **offers** (15 columns)
- **payment_logs** (14 columns)
- **properties** (39 columns)
- **property_document_requirements** (5 columns)
- **property_document_verifications** (9 columns)
- **property_fraud_signals** (11 columns)
- **property_highlights** (12 columns)
- **property_media** (11 columns)
- **property_price_history** (6 columns)
- **property_trust_scores** (8 columns)
- **property_verifications** (16 columns)
- **property_views** (5 columns)
- **reservations** (24 columns)
- **roles** (3 columns)
- **saved_properties** (6 columns)
- **seller_settings** (14 columns)
- **sessions** (10 columns)
- **sla_breaches** (11 columns)
- **sla_configs** (9 columns)
- **transaction_documents** (12 columns)
- **transactions** (46 columns)
- **user_roles** (6 columns)
- **users** (13 columns)
- **verification_audit_logs** (7 columns)
- **verification_checklist_items** (5 columns)
- **verification_checklist_results** (6 columns)
- **verification_document_types** (6 columns)
- **visit_feedback_agent** (11 columns)
- **visit_feedback_buyer** (12 columns)
- **visit_images** (11 columns)
- **visit_otp** (5 columns)
- **visit_requests** (15 columns)
- **visit_verifications** (13 columns)


## Detailed Table Information

### Table: `admin_actions`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| admin_id | uuid | NO | NULL |
| action | text | NO | NULL |
| target_type | text | NO | NULL |
| target_id | uuid | NO | NULL |
| reason | text | NO | NULL |
| previous_state | text | YES | NULL |
| new_state | text | YES | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `admin_actions_action_not_null` (CHECK) on column `None`
- Constraint: `admin_actions_admin_id_fkey` (FOREIGN KEY) on column `admin_id`
- Constraint: `admin_actions_admin_id_not_null` (CHECK) on column `None`
- Constraint: `admin_actions_created_at_not_null` (CHECK) on column `None`
- Constraint: `admin_actions_id_not_null` (CHECK) on column `None`
- Constraint: `admin_actions_pkey` (PRIMARY KEY) on column `id`
- Constraint: `admin_actions_reason_not_null` (CHECK) on column `None`
- Constraint: `admin_actions_target_id_not_null` (CHECK) on column `None`
- Constraint: `admin_actions_target_type_not_null` (CHECK) on column `None`
- Constraint: `chk_admin_action_not_empty` (CHECK) on column `None`
- Constraint: `chk_reason_not_empty` (CHECK) on column `None`
- Index: `admin_actions_pkey`
  - CREATE UNIQUE INDEX admin_actions_pkey ON public.admin_actions USING btree (id)
- Index: `idx_admin_actions_admin`
  - CREATE INDEX idx_admin_actions_admin ON public.admin_actions USING btree (admin_id)
- Index: `idx_admin_actions_target`
  - CREATE INDEX idx_admin_actions_target ON public.admin_actions USING btree (target_type, target_id)
- Index: `idx_admin_actions_created`
  - CREATE INDEX idx_admin_actions_created ON public.admin_actions USING btree (created_at)


**Foreign Keys:**

- `admin_id` -> `users`.`id`


---

### Table: `agent_assignments`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| agent_id | uuid | NO | NULL |
| status | USER-DEFINED | NO | 'REQUESTED'::assignment_status |
| requested_at | timestamp without time zone | NO | now() |
| responded_at | timestamp without time zone | YES | NULL |
| completed_at | timestamp without time zone | YES | NULL |
| decline_reason | text | YES | NULL |


**Constraints & Indexes:**

- Constraint: `agent_assignments_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `agent_assignments_agent_id_not_null` (CHECK) on column `None`
- Constraint: `agent_assignments_id_not_null` (CHECK) on column `None`
- Constraint: `agent_assignments_pkey` (PRIMARY KEY) on column `id`
- Constraint: `agent_assignments_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `agent_assignments_property_id_not_null` (CHECK) on column `None`
- Constraint: `agent_assignments_requested_at_not_null` (CHECK) on column `None`
- Constraint: `agent_assignments_status_not_null` (CHECK) on column `None`
- Index: `agent_assignments_pkey`
  - CREATE UNIQUE INDEX agent_assignments_pkey ON public.agent_assignments USING btree (id)
- Index: `idx_agent_assignments_property`
  - CREATE INDEX idx_agent_assignments_property ON public.agent_assignments USING btree (property_id)
- Index: `idx_agent_assignments_agent`
  - CREATE INDEX idx_agent_assignments_agent ON public.agent_assignments USING btree (agent_id)
- Index: `idx_agent_assignments_status`
  - CREATE INDEX idx_agent_assignments_status ON public.agent_assignments USING btree (status)
- Index: `idx_agent_assignments_active`
  - CREATE INDEX idx_agent_assignments_active ON public.agent_assignments USING btree (property_id) W...
- Index: `idx_unique_active_assignment`
  - CREATE UNIQUE INDEX idx_unique_active_assignment ON public.agent_assignments USING btree (propert...


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `agent_id` -> `agent_profiles`.`user_id`


---

### Table: `agent_crm_leads`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| agent_id | uuid | NO | NULL |
| client_id | uuid | YES | NULL |
| name | character varying | NO | NULL |
| email | character varying | NO | NULL |
| phone | character varying | YES | NULL |
| type | character varying | NO | NULL |
| pipeline_stage | character varying | NO | 'NEW'::character varying |
| temperature | character varying | NO | 'WARM'::character varying |
| notes | text | YES | NULL |
| expected_value | numeric | YES | NULL |
| last_contacted_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |


**Constraints & Indexes:**

- Constraint: `agent_crm_leads_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `agent_crm_leads_agent_id_not_null` (CHECK) on column `None`
- Constraint: `agent_crm_leads_client_id_fkey` (FOREIGN KEY) on column `client_id`
- Constraint: `agent_crm_leads_email_not_null` (CHECK) on column `None`
- Constraint: `agent_crm_leads_id_not_null` (CHECK) on column `None`
- Constraint: `agent_crm_leads_name_not_null` (CHECK) on column `None`
- Constraint: `agent_crm_leads_pipeline_stage_check` (CHECK) on column `None`
- Constraint: `agent_crm_leads_pipeline_stage_not_null` (CHECK) on column `None`
- Constraint: `agent_crm_leads_pkey` (PRIMARY KEY) on column `id`
- Constraint: `agent_crm_leads_temperature_check` (CHECK) on column `None`
- Constraint: `agent_crm_leads_temperature_not_null` (CHECK) on column `None`
- Constraint: `agent_crm_leads_type_check` (CHECK) on column `None`
- Constraint: `agent_crm_leads_type_not_null` (CHECK) on column `None`
- Index: `agent_crm_leads_pkey`
  - CREATE UNIQUE INDEX agent_crm_leads_pkey ON public.agent_crm_leads USING btree (id)
- Index: `idx_agent_crm_leads_agent_id`
  - CREATE INDEX idx_agent_crm_leads_agent_id ON public.agent_crm_leads USING btree (agent_id)


**Foreign Keys:**

- `agent_id` -> `users`.`id`
- `client_id` -> `users`.`id`


---

### Table: `agent_marketing_profiles`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| agent_id | uuid | NO | NULL |
| bio | text | YES | NULL |
| social_links | jsonb | YES | '{}'::jsonb |
| service_areas | ARRAY | YES | '{}'::text[] |
| photo_url | character varying | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |


**Constraints & Indexes:**

- Constraint: `agent_marketing_profiles_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `agent_marketing_profiles_agent_id_not_null` (CHECK) on column `None`
- Constraint: `agent_marketing_profiles_pkey` (PRIMARY KEY) on column `agent_id`
- Index: `agent_marketing_profiles_pkey`
  - CREATE UNIQUE INDEX agent_marketing_profiles_pkey ON public.agent_marketing_profiles USING btree ...


**Foreign Keys:**

- `agent_id` -> `users`.`id`


---

### Table: `agent_profiles`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | NO | NULL |
| pan_number | text | NO | NULL |
| aadhaar_number | text | NO | NULL |
| service_radius_km | integer | NO | 50 |
| created_at | timestamp without time zone | NO | now() |
| is_active | boolean | NO | true |
| kyc_status | text | NO | 'PENDING'::text |
| rating | double precision | NO | 0.0 |
| total_cases | integer | NO | 0 |


**Constraints & Indexes:**

- Constraint: `agent_profiles_aadhaar_number_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_created_at_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_id_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_is_active_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_kyc_status_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_pan_number_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_pkey` (PRIMARY KEY) on column `id`
- Constraint: `agent_profiles_rating_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_service_radius_km_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_total_cases_not_null` (CHECK) on column `None`
- Constraint: `agent_profiles_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Constraint: `agent_profiles_user_id_key` (UNIQUE) on column `user_id`
- Constraint: `agent_profiles_user_id_not_null` (CHECK) on column `None`
- Constraint: `chk_service_radius` (CHECK) on column `None`
- Index: `agent_profiles_pkey`
  - CREATE UNIQUE INDEX agent_profiles_pkey ON public.agent_profiles USING btree (id)
- Index: `agent_profiles_user_id_key`
  - CREATE UNIQUE INDEX agent_profiles_user_id_key ON public.agent_profiles USING btree (user_id)
- Index: `idx_agent_profiles_user_id`
  - CREATE INDEX idx_agent_profiles_user_id ON public.agent_profiles USING btree (user_id)
- Index: `idx_agent_profiles_rating`
  - CREATE INDEX idx_agent_profiles_rating ON public.agent_profiles USING btree (rating)
- Index: `idx_agent_profiles_status`
  - CREATE INDEX idx_agent_profiles_status ON public.agent_profiles USING btree (is_active, kyc_status)


**Foreign Keys:**

- `user_id` -> `users`.`id`


---

### Table: `agent_schedule_events`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| agent_id | uuid | NO | NULL |
| title | character varying | NO | NULL |
| start_time | timestamp with time zone | NO | NULL |
| end_time | timestamp with time zone | YES | NULL |
| event_type | character varying | NO | NULL |
| color | character varying | YES | '#3B82F6'::character varying |
| created_at | timestamp with time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `agent_schedule_events_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `agent_schedule_events_agent_id_not_null` (CHECK) on column `None`
- Constraint: `agent_schedule_events_event_type_not_null` (CHECK) on column `None`
- Constraint: `agent_schedule_events_id_not_null` (CHECK) on column `None`
- Constraint: `agent_schedule_events_pkey` (PRIMARY KEY) on column `id`
- Constraint: `agent_schedule_events_start_time_not_null` (CHECK) on column `None`
- Constraint: `agent_schedule_events_title_not_null` (CHECK) on column `None`
- Index: `agent_schedule_events_pkey`
  - CREATE UNIQUE INDEX agent_schedule_events_pkey ON public.agent_schedule_events USING btree (id)
- Index: `idx_agent_schedule_agent_id`
  - CREATE INDEX idx_agent_schedule_agent_id ON public.agent_schedule_events USING btree (agent_id)
- Index: `idx_agent_schedule_start_time`
  - CREATE INDEX idx_agent_schedule_start_time ON public.agent_schedule_events USING btree (start_time)


**Foreign Keys:**

- `agent_id` -> `users`.`id`


---

### Table: `agent_verification_scores`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| agent_id | uuid | NO | NULL |
| total_verifications | integer | YES | 0 |
| rejected_verifications | integer | YES | 0 |
| fraud_reports_against_approvals | integer | YES | 0 |
| trust_score | integer | YES | 100 |
| updated_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `agent_verification_scores_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `agent_verification_scores_agent_id_not_null` (CHECK) on column `None`
- Constraint: `agent_verification_scores_pkey` (PRIMARY KEY) on column `agent_id`
- Index: `agent_verification_scores_pkey`
  - CREATE UNIQUE INDEX agent_verification_scores_pkey ON public.agent_verification_scores USING btre...


**Foreign Keys:**

- `agent_id` -> `agent_profiles`.`user_id`


---

### Table: `agreements`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| deal_id | uuid | NO | NULL |
| agreement_type | USER-DEFINED | NO | NULL |
| version | integer | NO | 1 |
| document_url | text | YES | NULL |
| file_hash | text | YES | NULL |
| signed_by_buyer_at | timestamp without time zone | YES | NULL |
| signed_by_seller_at | timestamp without time zone | YES | NULL |
| signed_by_agent_at | timestamp without time zone | YES | NULL |
| buyer_ip | text | YES | NULL |
| seller_ip | text | YES | NULL |
| agent_ip | text | YES | NULL |
| status | USER-DEFINED | NO | 'DRAFT'::agreement_status |
| voided_by | uuid | YES | NULL |
| void_reason | text | YES | NULL |
| voided_at | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `agreements_agreement_type_not_null` (CHECK) on column `None`
- Constraint: `agreements_created_at_not_null` (CHECK) on column `None`
- Constraint: `agreements_deal_id_fkey` (FOREIGN KEY) on column `deal_id`
- Constraint: `agreements_deal_id_not_null` (CHECK) on column `None`
- Constraint: `agreements_id_not_null` (CHECK) on column `None`
- Constraint: `agreements_pkey` (PRIMARY KEY) on column `id`
- Constraint: `agreements_status_not_null` (CHECK) on column `None`
- Constraint: `agreements_version_not_null` (CHECK) on column `None`
- Constraint: `agreements_voided_by_fkey` (FOREIGN KEY) on column `voided_by`
- Constraint: `chk_void_requires_reason` (CHECK) on column `None`
- Index: `agreements_pkey`
  - CREATE UNIQUE INDEX agreements_pkey ON public.agreements USING btree (id)
- Index: `idx_agreements_deal`
  - CREATE INDEX idx_agreements_deal ON public.agreements USING btree (deal_id)
- Index: `idx_agreements_type`
  - CREATE INDEX idx_agreements_type ON public.agreements USING btree (deal_id, agreement_type)
- Index: `idx_agreements_status`
  - CREATE INDEX idx_agreements_status ON public.agreements USING btree (status)
- Index: `idx_unique_agreement_version`
  - CREATE UNIQUE INDEX idx_unique_agreement_version ON public.agreements USING btree (deal_id, agree...


**Foreign Keys:**

- `deal_id` -> `deals`.`id`
- `voided_by` -> `users`.`id`


---

### Table: `audit_logs`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | YES | NULL |
| action | text | NO | NULL |
| entity_type | text | NO | NULL |
| entity_id | uuid | YES | NULL |
| timestamp | timestamp without time zone | NO | now() |
| ip_address | text | YES | NULL |
| details | jsonb | YES | NULL |


**Constraints & Indexes:**

- Constraint: `audit_logs_action_not_null` (CHECK) on column `None`
- Constraint: `audit_logs_entity_type_not_null` (CHECK) on column `None`
- Constraint: `audit_logs_id_not_null` (CHECK) on column `None`
- Constraint: `audit_logs_pkey` (PRIMARY KEY) on column `id`
- Constraint: `audit_logs_timestamp_not_null` (CHECK) on column `None`
- Constraint: `audit_logs_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Index: `audit_logs_pkey`
  - CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)
- Index: `idx_audit_logs_user_id`
  - CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id)
- Index: `idx_audit_logs_entity`
  - CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id)
- Index: `idx_audit_logs_action`
  - CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action)
- Index: `idx_audit_logs_timestamp`
  - CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp")
- Index: `idx_audit_logs_user`
  - CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id)
- Index: `idx_audit_logs_ip`
  - CREATE INDEX idx_audit_logs_ip ON public.audit_logs USING btree (ip_address)


**Foreign Keys:**

- `user_id` -> `users`.`id`


---

### Table: `collection_items`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| collection_id | uuid | NO | NULL |
| saved_property_id | uuid | NO | NULL |
| added_at | timestamp with time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `collection_items_collection_id_fkey` (FOREIGN KEY) on column `collection_id`
- Constraint: `collection_items_collection_id_not_null` (CHECK) on column `None`
- Constraint: `collection_items_pkey` (PRIMARY KEY) on column `collection_id`
- Constraint: `collection_items_pkey` (PRIMARY KEY) on column `saved_property_id`
- Constraint: `collection_items_saved_property_id_fkey` (FOREIGN KEY) on column `saved_property_id`
- Constraint: `collection_items_saved_property_id_not_null` (CHECK) on column `None`
- Index: `collection_items_pkey`
  - CREATE UNIQUE INDEX collection_items_pkey ON public.collection_items USING btree (collection_id, ...
- Index: `idx_collection_items_collection_id`
  - CREATE INDEX idx_collection_items_collection_id ON public.collection_items USING btree (collectio...
- Index: `idx_collection_items_saved_property_id`
  - CREATE INDEX idx_collection_items_saved_property_id ON public.collection_items USING btree (saved...


**Foreign Keys:**

- `collection_id` -> `collections`.`id`
- `saved_property_id` -> `saved_properties`.`id`


---

### Table: `collections`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| name | character varying | NO | NULL |
| color | character varying | YES | 'rose'::character varying |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `collections_id_not_null` (CHECK) on column `None`
- Constraint: `collections_name_not_null` (CHECK) on column `None`
- Constraint: `collections_pkey` (PRIMARY KEY) on column `id`
- Constraint: `collections_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Constraint: `collections_user_id_not_null` (CHECK) on column `None`
- Index: `collections_pkey`
  - CREATE UNIQUE INDEX collections_pkey ON public.collections USING btree (id)
- Index: `idx_collections_user_name`
  - CREATE UNIQUE INDEX idx_collections_user_name ON public.collections USING btree (user_id, lower((...
- Index: `idx_collections_user_id`
  - CREATE INDEX idx_collections_user_id ON public.collections USING btree (user_id)


**Foreign Keys:**

- `user_id` -> `users`.`id`


---

### Table: `conversations`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | YES | NULL |
| buyer_id | uuid | NO | NULL |
| agent_id | uuid | NO | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `conversations_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `conversations_agent_id_not_null` (CHECK) on column `None`
- Constraint: `conversations_buyer_id_fkey` (FOREIGN KEY) on column `buyer_id`
- Constraint: `conversations_buyer_id_not_null` (CHECK) on column `None`
- Constraint: `conversations_created_at_not_null` (CHECK) on column `None`
- Constraint: `conversations_id_not_null` (CHECK) on column `None`
- Constraint: `conversations_pkey` (PRIMARY KEY) on column `id`
- Constraint: `conversations_property_id_buyer_id_agent_id_key` (UNIQUE) on column `property_id`
- Constraint: `conversations_property_id_buyer_id_agent_id_key` (UNIQUE) on column `buyer_id`
- Constraint: `conversations_property_id_buyer_id_agent_id_key` (UNIQUE) on column `agent_id`
- Constraint: `conversations_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `conversations_updated_at_not_null` (CHECK) on column `None`
- Index: `conversations_pkey`
  - CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id)
- Index: `conversations_property_id_buyer_id_agent_id_key`
  - CREATE UNIQUE INDEX conversations_property_id_buyer_id_agent_id_key ON public.conversations USING...
- Index: `idx_conversations_buyer`
  - CREATE INDEX idx_conversations_buyer ON public.conversations USING btree (buyer_id)
- Index: `idx_conversations_agent`
  - CREATE INDEX idx_conversations_agent ON public.conversations USING btree (agent_id)
- Index: `idx_conversations_property`
  - CREATE INDEX idx_conversations_property ON public.conversations USING btree (property_id)
- Index: `idx_conversations_updated`
  - CREATE INDEX idx_conversations_updated ON public.conversations USING btree (updated_at DESC)


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `buyer_id` -> `users`.`id`
- `agent_id` -> `users`.`id`


---

### Table: `deal_events`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| deal_id | uuid | NO | NULL |
| event_type | USER-DEFINED | NO | NULL |
| from_status | USER-DEFINED | YES | NULL |
| to_status | USER-DEFINED | YES | NULL |
| actor_id | uuid | NO | NULL |
| actor_role | text | NO | NULL |
| notes | text | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `deal_events_actor_id_fkey` (FOREIGN KEY) on column `actor_id`
- Constraint: `deal_events_actor_id_not_null` (CHECK) on column `None`
- Constraint: `deal_events_actor_role_not_null` (CHECK) on column `None`
- Constraint: `deal_events_created_at_not_null` (CHECK) on column `None`
- Constraint: `deal_events_deal_id_fkey` (FOREIGN KEY) on column `deal_id`
- Constraint: `deal_events_deal_id_not_null` (CHECK) on column `None`
- Constraint: `deal_events_event_type_not_null` (CHECK) on column `None`
- Constraint: `deal_events_id_not_null` (CHECK) on column `None`
- Constraint: `deal_events_pkey` (PRIMARY KEY) on column `id`
- Index: `deal_events_pkey`
  - CREATE UNIQUE INDEX deal_events_pkey ON public.deal_events USING btree (id)
- Index: `idx_deal_events_deal`
  - CREATE INDEX idx_deal_events_deal ON public.deal_events USING btree (deal_id)
- Index: `idx_deal_events_type`
  - CREATE INDEX idx_deal_events_type ON public.deal_events USING btree (event_type)
- Index: `idx_deal_events_actor`
  - CREATE INDEX idx_deal_events_actor ON public.deal_events USING btree (actor_id)
- Index: `idx_deal_events_created`
  - CREATE INDEX idx_deal_events_created ON public.deal_events USING btree (created_at)


**Foreign Keys:**

- `actor_id` -> `users`.`id`
- `deal_id` -> `deals`.`id`


---

### Table: `deals`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| buyer_id | uuid | NO | NULL |
| seller_id | uuid | NO | NULL |
| agent_id | uuid | NO | NULL |
| status | USER-DEFINED | NO | 'INITIATED'::deal_status |
| visit_request_id | uuid | YES | NULL |
| offer_id | uuid | YES | NULL |
| reservation_id | uuid | YES | NULL |
| transaction_id | uuid | YES | NULL |
| agreed_price | numeric | YES | NULL |
| token_amount | numeric | YES | NULL |
| commission_amount | numeric | YES | NULL |
| platform_fee | numeric | YES | NULL |
| agent_commission | numeric | YES | NULL |
| buyer_snapshot | jsonb | NO | '{}'::jsonb |
| seller_snapshot | jsonb | NO | '{}'::jsonb |
| agent_snapshot | jsonb | NO | '{}'::jsonb |
| cancelled_at | timestamp without time zone | YES | NULL |
| cancelled_by | uuid | YES | NULL |
| cancellation_reason | text | YES | NULL |
| expired_at | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |
| pre_dispute_status | text | YES | NULL |
| registration_date | timestamp without time zone | YES | NULL |
| registration_notes | text | YES | NULL |
| execution_stage | character varying | YES | 'AWAITING_DOCS'::character varying |


**Constraints & Indexes:**

- Constraint: `chk_agreed_price_positive` (CHECK) on column `None`
- Constraint: `chk_commission_positive` (CHECK) on column `None`
- Constraint: `chk_different_deal_parties` (CHECK) on column `None`
- Constraint: `chk_token_amount_positive` (CHECK) on column `None`
- Constraint: `deals_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `deals_agent_id_not_null` (CHECK) on column `None`
- Constraint: `deals_agent_snapshot_not_null` (CHECK) on column `None`
- Constraint: `deals_buyer_id_fkey` (FOREIGN KEY) on column `buyer_id`
- Constraint: `deals_buyer_id_not_null` (CHECK) on column `None`
- Constraint: `deals_buyer_snapshot_not_null` (CHECK) on column `None`
- Constraint: `deals_cancelled_by_fkey` (FOREIGN KEY) on column `cancelled_by`
- Constraint: `deals_created_at_not_null` (CHECK) on column `None`
- Constraint: `deals_id_not_null` (CHECK) on column `None`
- Constraint: `deals_offer_id_fkey` (FOREIGN KEY) on column `offer_id`
- Constraint: `deals_pkey` (PRIMARY KEY) on column `id`
- Constraint: `deals_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `deals_property_id_not_null` (CHECK) on column `None`
- Constraint: `deals_reservation_id_fkey` (FOREIGN KEY) on column `reservation_id`
- Constraint: `deals_seller_id_fkey` (FOREIGN KEY) on column `seller_id`
- Constraint: `deals_seller_id_not_null` (CHECK) on column `None`
- Constraint: `deals_seller_snapshot_not_null` (CHECK) on column `None`
- Constraint: `deals_status_not_null` (CHECK) on column `None`
- Constraint: `deals_transaction_id_fkey` (FOREIGN KEY) on column `transaction_id`
- Constraint: `deals_updated_at_not_null` (CHECK) on column `None`
- Constraint: `deals_visit_request_id_fkey` (FOREIGN KEY) on column `visit_request_id`
- Index: `deals_pkey`
  - CREATE UNIQUE INDEX deals_pkey ON public.deals USING btree (id)
- Index: `idx_deals_property`
  - CREATE INDEX idx_deals_property ON public.deals USING btree (property_id)
- Index: `idx_deals_buyer`
  - CREATE INDEX idx_deals_buyer ON public.deals USING btree (buyer_id)
- Index: `idx_deals_seller`
  - CREATE INDEX idx_deals_seller ON public.deals USING btree (seller_id)
- Index: `idx_deals_agent`
  - CREATE INDEX idx_deals_agent ON public.deals USING btree (agent_id)
- Index: `idx_deals_status`
  - CREATE INDEX idx_deals_status ON public.deals USING btree (status)
- Index: `idx_deals_created`
  - CREATE INDEX idx_deals_created ON public.deals USING btree (created_at)
- Index: `idx_unique_active_deal_per_property`
  - CREATE UNIQUE INDEX idx_unique_active_deal_per_property ON public.deals USING btree (property_id)...


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `buyer_id` -> `users`.`id`
- `seller_id` -> `users`.`id`
- `agent_id` -> `agent_profiles`.`user_id`
- `visit_request_id` -> `visit_requests`.`id`
- `offer_id` -> `offers`.`id`
- `reservation_id` -> `reservations`.`id`
- `transaction_id` -> `transactions`.`id`
- `cancelled_by` -> `users`.`id`


---

### Table: `dispute_evidence`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| dispute_id | uuid | NO | NULL |
| deal_id | uuid | YES | NULL |
| evidence_type | USER-DEFINED | NO | NULL |
| file_url | text | NO | NULL |
| file_hash | text | YES | NULL |
| description | text | YES | NULL |
| uploaded_by | uuid | NO | NULL |
| uploaded_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `dispute_evidence_deal_id_fkey` (FOREIGN KEY) on column `deal_id`
- Constraint: `dispute_evidence_dispute_id_fkey` (FOREIGN KEY) on column `dispute_id`
- Constraint: `dispute_evidence_dispute_id_not_null` (CHECK) on column `None`
- Constraint: `dispute_evidence_evidence_type_not_null` (CHECK) on column `None`
- Constraint: `dispute_evidence_file_url_not_null` (CHECK) on column `None`
- Constraint: `dispute_evidence_id_not_null` (CHECK) on column `None`
- Constraint: `dispute_evidence_pkey` (PRIMARY KEY) on column `id`
- Constraint: `dispute_evidence_uploaded_at_not_null` (CHECK) on column `None`
- Constraint: `dispute_evidence_uploaded_by_fkey` (FOREIGN KEY) on column `uploaded_by`
- Constraint: `dispute_evidence_uploaded_by_not_null` (CHECK) on column `None`
- Index: `dispute_evidence_pkey`
  - CREATE UNIQUE INDEX dispute_evidence_pkey ON public.dispute_evidence USING btree (id)
- Index: `idx_dispute_evidence_dispute`
  - CREATE INDEX idx_dispute_evidence_dispute ON public.dispute_evidence USING btree (dispute_id)
- Index: `idx_dispute_evidence_deal`
  - CREATE INDEX idx_dispute_evidence_deal ON public.dispute_evidence USING btree (deal_id) WHERE (de...
- Index: `idx_dispute_evidence_type`
  - CREATE INDEX idx_dispute_evidence_type ON public.dispute_evidence USING btree (evidence_type)


**Foreign Keys:**

- `dispute_id` -> `disputes`.`id`
- `deal_id` -> `deals`.`id`
- `uploaded_by` -> `users`.`id`


---

### Table: `disputes`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| raised_by_id | uuid | NO | NULL |
| against_id | uuid | NO | NULL |
| property_id | uuid | YES | NULL |
| transaction_id | uuid | YES | NULL |
| visit_id | uuid | YES | NULL |
| offer_id | uuid | YES | NULL |
| category | USER-DEFINED | NO | NULL |
| title | text | NO | NULL |
| description | text | NO | NULL |
| evidence_urls | ARRAY | YES | NULL |
| status | USER-DEFINED | NO | 'OPEN'::dispute_status |
| assigned_admin_id | uuid | YES | NULL |
| decision | USER-DEFINED | YES | NULL |
| resolution_notes | text | YES | NULL |
| resolved_at | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |
| deal_id | uuid | YES | NULL |
| amount_involved | numeric | YES | NULL |
| auto_created | boolean | YES | false |
| refund_status | text | YES | NULL |


**Constraints & Indexes:**

- Constraint: `chk_different_parties` (CHECK) on column `None`
- Constraint: `chk_has_related_entity` (CHECK) on column `None`
- Constraint: `chk_refund_status` (CHECK) on column `None`
- Constraint: `disputes_against_id_fkey` (FOREIGN KEY) on column `against_id`
- Constraint: `disputes_against_id_not_null` (CHECK) on column `None`
- Constraint: `disputes_assigned_admin_id_fkey` (FOREIGN KEY) on column `assigned_admin_id`
- Constraint: `disputes_category_not_null` (CHECK) on column `None`
- Constraint: `disputes_created_at_not_null` (CHECK) on column `None`
- Constraint: `disputes_deal_id_fkey` (FOREIGN KEY) on column `deal_id`
- Constraint: `disputes_description_not_null` (CHECK) on column `None`
- Constraint: `disputes_id_not_null` (CHECK) on column `None`
- Constraint: `disputes_offer_id_fkey` (FOREIGN KEY) on column `offer_id`
- Constraint: `disputes_pkey` (PRIMARY KEY) on column `id`
- Constraint: `disputes_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `disputes_raised_by_id_fkey` (FOREIGN KEY) on column `raised_by_id`
- Constraint: `disputes_raised_by_id_not_null` (CHECK) on column `None`
- Constraint: `disputes_status_not_null` (CHECK) on column `None`
- Constraint: `disputes_title_not_null` (CHECK) on column `None`
- Constraint: `disputes_transaction_id_fkey` (FOREIGN KEY) on column `transaction_id`
- Constraint: `disputes_updated_at_not_null` (CHECK) on column `None`
- Constraint: `disputes_visit_id_fkey` (FOREIGN KEY) on column `visit_id`
- Index: `disputes_pkey`
  - CREATE UNIQUE INDEX disputes_pkey ON public.disputes USING btree (id)
- Index: `idx_disputes_raised_by`
  - CREATE INDEX idx_disputes_raised_by ON public.disputes USING btree (raised_by_id)
- Index: `idx_disputes_against`
  - CREATE INDEX idx_disputes_against ON public.disputes USING btree (against_id)
- Index: `idx_disputes_property`
  - CREATE INDEX idx_disputes_property ON public.disputes USING btree (property_id) WHERE (property_i...
- Index: `idx_disputes_transaction`
  - CREATE INDEX idx_disputes_transaction ON public.disputes USING btree (transaction_id) WHERE (tran...
- Index: `idx_disputes_status`
  - CREATE INDEX idx_disputes_status ON public.disputes USING btree (status)
- Index: `idx_disputes_category`
  - CREATE INDEX idx_disputes_category ON public.disputes USING btree (category)
- Index: `idx_disputes_assigned_admin`
  - CREATE INDEX idx_disputes_assigned_admin ON public.disputes USING btree (assigned_admin_id) WHERE...
- Index: `idx_disputes_deal`
  - CREATE INDEX idx_disputes_deal ON public.disputes USING btree (deal_id) WHERE (deal_id IS NOT NULL)


**Foreign Keys:**

- `raised_by_id` -> `users`.`id`
- `against_id` -> `users`.`id`
- `property_id` -> `properties`.`id`
- `transaction_id` -> `transactions`.`id`
- `visit_id` -> `visit_requests`.`id`
- `offer_id` -> `offers`.`id`
- `assigned_admin_id` -> `users`.`id`
- `deal_id` -> `deals`.`id`


---

### Table: `duplicate_property_detection`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| matched_property_id | uuid | NO | NULL |
| similarity_score | double precision | NO | NULL |
| detection_method | text | NO | NULL |
| reviewed | boolean | YES | false |
| is_duplicate | boolean | YES | NULL |
| created_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `duplicate_property_detection_detection_method_not_null` (CHECK) on column `None`
- Constraint: `duplicate_property_detection_id_not_null` (CHECK) on column `None`
- Constraint: `duplicate_property_detection_matched_property_id_fkey` (FOREIGN KEY) on column `matched_property_id`
- Constraint: `duplicate_property_detection_matched_property_id_not_null` (CHECK) on column `None`
- Constraint: `duplicate_property_detection_pkey` (PRIMARY KEY) on column `id`
- Constraint: `duplicate_property_detection_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `duplicate_property_detection_property_id_matched_property_i_key` (UNIQUE) on column `property_id`
- Constraint: `duplicate_property_detection_property_id_matched_property_i_key` (UNIQUE) on column `matched_property_id`
- Constraint: `duplicate_property_detection_property_id_not_null` (CHECK) on column `None`
- Constraint: `duplicate_property_detection_similarity_score_not_null` (CHECK) on column `None`
- Index: `duplicate_property_detection_pkey`
  - CREATE UNIQUE INDEX duplicate_property_detection_pkey ON public.duplicate_property_detection USIN...
- Index: `duplicate_property_detection_property_id_matched_property_i_key`
  - CREATE UNIQUE INDEX duplicate_property_detection_property_id_matched_property_i_key ON public.dup...


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `matched_property_id` -> `properties`.`id`


---

### Table: `email_otp_verifications`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | NO | NULL |
| otp_hash | text | NO | NULL |
| expires_at | timestamp without time zone | NO | NULL |
| attempts | integer | NO | 0 |
| consumed_at | timestamp without time zone | YES | NULL |
| consumed_by_ip | text | YES | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `chk_otp_attempts_positive` (CHECK) on column `None`
- Constraint: `email_otp_verifications_attempts_not_null` (CHECK) on column `None`
- Constraint: `email_otp_verifications_created_at_not_null` (CHECK) on column `None`
- Constraint: `email_otp_verifications_expires_at_not_null` (CHECK) on column `None`
- Constraint: `email_otp_verifications_id_not_null` (CHECK) on column `None`
- Constraint: `email_otp_verifications_otp_hash_not_null` (CHECK) on column `None`
- Constraint: `email_otp_verifications_pkey` (PRIMARY KEY) on column `id`
- Constraint: `email_otp_verifications_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Constraint: `email_otp_verifications_user_id_not_null` (CHECK) on column `None`
- Index: `email_otp_verifications_pkey`
  - CREATE UNIQUE INDEX email_otp_verifications_pkey ON public.email_otp_verifications USING btree (id)
- Index: `idx_email_otp_user_id`
  - CREATE INDEX idx_email_otp_user_id ON public.email_otp_verifications USING btree (user_id)
- Index: `idx_email_otp_expires_at`
  - CREATE INDEX idx_email_otp_expires_at ON public.email_otp_verifications USING btree (expires_at)
- Index: `idx_email_otp_unconsumed`
  - CREATE INDEX idx_email_otp_unconsumed ON public.email_otp_verifications USING btree (user_id) WHE...


**Foreign Keys:**

- `user_id` -> `users`.`id`


---

### Table: `financial_ledgers`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| deal_id | uuid | NO | NULL |
| total_deal_value | numeric | NO | NULL |
| currency | character varying | YES | 'INR'::character varying |
| total_commission_owed | numeric | YES | 0 |
| platform_fee | numeric | YES | 0 |
| agent_commission | numeric | YES | 0 |
| status | character varying | YES | 'PENDING'::character varying |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `financial_ledgers_deal_id_fkey` (FOREIGN KEY) on column `deal_id`
- Constraint: `financial_ledgers_deal_id_not_null` (CHECK) on column `None`
- Constraint: `financial_ledgers_id_not_null` (CHECK) on column `None`
- Constraint: `financial_ledgers_pkey` (PRIMARY KEY) on column `id`
- Constraint: `financial_ledgers_total_deal_value_not_null` (CHECK) on column `None`
- Constraint: `unique_deal_ledger` (UNIQUE) on column `deal_id`
- Index: `financial_ledgers_pkey`
  - CREATE UNIQUE INDEX financial_ledgers_pkey ON public.financial_ledgers USING btree (id)
- Index: `unique_deal_ledger`
  - CREATE UNIQUE INDEX unique_deal_ledger ON public.financial_ledgers USING btree (deal_id)
- Index: `idx_financial_ledgers_deal_id`
  - CREATE INDEX idx_financial_ledgers_deal_id ON public.financial_ledgers USING btree (deal_id)


**Foreign Keys:**

- `deal_id` -> `deals`.`id`


---

### Table: `ledger_entries`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| ledger_id | uuid | NO | NULL |
| entry_type | character varying | NO | NULL |
| amount | numeric | NO | NULL |
| direction | character varying | NO | NULL |
| description | text | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| verification_status | character varying | YES | 'PENDING'::character varying |
| verified_at | timestamp with time zone | YES | NULL |
| verified_by | uuid | YES | NULL |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `ledger_entries_amount_not_null` (CHECK) on column `None`
- Constraint: `ledger_entries_created_by_fkey` (FOREIGN KEY) on column `created_by`
- Constraint: `ledger_entries_direction_check` (CHECK) on column `None`
- Constraint: `ledger_entries_direction_not_null` (CHECK) on column `None`
- Constraint: `ledger_entries_entry_type_not_null` (CHECK) on column `None`
- Constraint: `ledger_entries_id_not_null` (CHECK) on column `None`
- Constraint: `ledger_entries_ledger_id_fkey` (FOREIGN KEY) on column `ledger_id`
- Constraint: `ledger_entries_ledger_id_not_null` (CHECK) on column `None`
- Constraint: `ledger_entries_pkey` (PRIMARY KEY) on column `id`
- Constraint: `ledger_entries_verification_status_check` (CHECK) on column `None`
- Constraint: `ledger_entries_verified_by_fkey` (FOREIGN KEY) on column `verified_by`
- Index: `ledger_entries_pkey`
  - CREATE UNIQUE INDEX ledger_entries_pkey ON public.ledger_entries USING btree (id)
- Index: `idx_ledger_entries_ledger_id`
  - CREATE INDEX idx_ledger_entries_ledger_id ON public.ledger_entries USING btree (ledger_id)
- Index: `idx_ledger_entries_type`
  - CREATE INDEX idx_ledger_entries_type ON public.ledger_entries USING btree (entry_type)


**Foreign Keys:**

- `ledger_id` -> `financial_ledgers`.`id`
- `verified_by` -> `users`.`id`
- `created_by` -> `users`.`id`


---

### Table: `marketing_history`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| agent_id | uuid | NO | NULL |
| property_id | uuid | YES | NULL |
| template_id | character varying | NO | NULL |
| template_name | character varying | NO | NULL |
| asset_url | text | NO | NULL |
| asset_type | character varying | NO | NULL |
| generated_at | timestamp with time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `marketing_history_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `marketing_history_agent_id_not_null` (CHECK) on column `None`
- Constraint: `marketing_history_asset_type_not_null` (CHECK) on column `None`
- Constraint: `marketing_history_asset_url_not_null` (CHECK) on column `None`
- Constraint: `marketing_history_id_not_null` (CHECK) on column `None`
- Constraint: `marketing_history_pkey` (PRIMARY KEY) on column `id`
- Constraint: `marketing_history_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `marketing_history_template_id_not_null` (CHECK) on column `None`
- Constraint: `marketing_history_template_name_not_null` (CHECK) on column `None`
- Index: `marketing_history_pkey`
  - CREATE UNIQUE INDEX marketing_history_pkey ON public.marketing_history USING btree (id)
- Index: `idx_marketing_history_agent_id`
  - CREATE INDEX idx_marketing_history_agent_id ON public.marketing_history USING btree (agent_id)


**Foreign Keys:**

- `agent_id` -> `users`.`id`
- `property_id` -> `properties`.`id`


---

### Table: `messages`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| conversation_id | uuid | NO | NULL |
| sender_id | uuid | NO | NULL |
| content | text | NO | NULL |
| read_at | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `messages_content_not_null` (CHECK) on column `None`
- Constraint: `messages_conversation_id_fkey` (FOREIGN KEY) on column `conversation_id`
- Constraint: `messages_conversation_id_not_null` (CHECK) on column `None`
- Constraint: `messages_created_at_not_null` (CHECK) on column `None`
- Constraint: `messages_id_not_null` (CHECK) on column `None`
- Constraint: `messages_pkey` (PRIMARY KEY) on column `id`
- Constraint: `messages_sender_id_fkey` (FOREIGN KEY) on column `sender_id`
- Constraint: `messages_sender_id_not_null` (CHECK) on column `None`
- Index: `messages_pkey`
  - CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id)
- Index: `idx_messages_conversation`
  - CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id)
- Index: `idx_messages_sender`
  - CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id)
- Index: `idx_messages_created`
  - CREATE INDEX idx_messages_created ON public.messages USING btree (created_at)
- Index: `idx_messages_unread`
  - CREATE INDEX idx_messages_unread ON public.messages USING btree (conversation_id) WHERE (read_at ...


**Foreign Keys:**

- `conversation_id` -> `conversations`.`id`
- `sender_id` -> `users`.`id`


---

### Table: `notification_intents`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| deal_id | uuid | YES | NULL |
| target_user_id | uuid | NO | NULL |
| target_role | text | NO | NULL |
| message_type | text | NO | NULL |
| severity | USER-DEFINED | NO | 'INFO'::notification_severity |
| title | text | NO | NULL |
| body | text | YES | NULL |
| delivered | boolean | NO | false |
| delivered_at | timestamp with time zone | YES | NULL |
| source | text | NO | 'SLA_CHECKER'::text |
| source_breach_id | uuid | YES | NULL |
| created_at | timestamp with time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `notification_intents_created_at_not_null` (CHECK) on column `None`
- Constraint: `notification_intents_deal_id_fkey` (FOREIGN KEY) on column `deal_id`
- Constraint: `notification_intents_delivered_not_null` (CHECK) on column `None`
- Constraint: `notification_intents_id_not_null` (CHECK) on column `None`
- Constraint: `notification_intents_message_type_not_null` (CHECK) on column `None`
- Constraint: `notification_intents_pkey` (PRIMARY KEY) on column `id`
- Constraint: `notification_intents_severity_not_null` (CHECK) on column `None`
- Constraint: `notification_intents_source_breach_id_fkey` (FOREIGN KEY) on column `source_breach_id`
- Constraint: `notification_intents_source_not_null` (CHECK) on column `None`
- Constraint: `notification_intents_target_role_not_null` (CHECK) on column `None`
- Constraint: `notification_intents_target_user_id_fkey` (FOREIGN KEY) on column `target_user_id`
- Constraint: `notification_intents_target_user_id_not_null` (CHECK) on column `None`
- Constraint: `notification_intents_title_not_null` (CHECK) on column `None`
- Index: `notification_intents_pkey`
  - CREATE UNIQUE INDEX notification_intents_pkey ON public.notification_intents USING btree (id)
- Index: `idx_notification_intents_target`
  - CREATE INDEX idx_notification_intents_target ON public.notification_intents USING btree (target_u...
- Index: `idx_notification_intents_undelivered`
  - CREATE INDEX idx_notification_intents_undelivered ON public.notification_intents USING btree (del...


**Foreign Keys:**

- `deal_id` -> `deals`.`id`
- `target_user_id` -> `users`.`id`
- `source_breach_id` -> `sla_breaches`.`id`


---

### Table: `notifications`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | NO | NULL |
| type | text | NO | NULL |
| title | text | NO | NULL |
| body | text | YES | NULL |
| link | text | YES | NULL |
| read_at | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `notifications_created_at_not_null` (CHECK) on column `None`
- Constraint: `notifications_id_not_null` (CHECK) on column `None`
- Constraint: `notifications_pkey` (PRIMARY KEY) on column `id`
- Constraint: `notifications_title_not_null` (CHECK) on column `None`
- Constraint: `notifications_type_not_null` (CHECK) on column `None`
- Constraint: `notifications_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Constraint: `notifications_user_id_not_null` (CHECK) on column `None`
- Index: `notifications_pkey`
  - CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)
- Index: `idx_notifications_user`
  - CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id)
- Index: `idx_notifications_created`
  - CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC)
- Index: `idx_notifications_unread`
  - CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE (read_a...


**Foreign Keys:**

- `user_id` -> `users`.`id`


---

### Table: `offers`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| buyer_id | uuid | NO | NULL |
| offered_price | numeric | NO | NULL |
| parent_offer_id | uuid | YES | NULL |
| counter_price | numeric | YES | NULL |
| status | USER-DEFINED | NO | 'PENDING'::offer_status |
| expires_at | timestamp without time zone | NO | NULL |
| rejection_reason | text | YES | NULL |
| buyer_message | text | YES | NULL |
| seller_message | text | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |
| responded_at | timestamp without time zone | YES | NULL |
| visit_id | uuid | YES | NULL |


**Constraints & Indexes:**

- Constraint: `chk_counter_price_positive` (CHECK) on column `None`
- Constraint: `chk_expires_after_created` (CHECK) on column `None`
- Constraint: `chk_offered_price_positive` (CHECK) on column `None`
- Constraint: `offers_buyer_id_fkey` (FOREIGN KEY) on column `buyer_id`
- Constraint: `offers_buyer_id_not_null` (CHECK) on column `None`
- Constraint: `offers_created_at_not_null` (CHECK) on column `None`
- Constraint: `offers_expires_at_not_null` (CHECK) on column `None`
- Constraint: `offers_id_not_null` (CHECK) on column `None`
- Constraint: `offers_offered_price_not_null` (CHECK) on column `None`
- Constraint: `offers_parent_offer_id_fkey` (FOREIGN KEY) on column `parent_offer_id`
- Constraint: `offers_pkey` (PRIMARY KEY) on column `id`
- Constraint: `offers_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `offers_property_id_not_null` (CHECK) on column `None`
- Constraint: `offers_status_not_null` (CHECK) on column `None`
- Constraint: `offers_updated_at_not_null` (CHECK) on column `None`
- Constraint: `offers_visit_id_fkey` (FOREIGN KEY) on column `visit_id`
- Index: `offers_pkey`
  - CREATE UNIQUE INDEX offers_pkey ON public.offers USING btree (id)
- Index: `idx_offers_property`
  - CREATE INDEX idx_offers_property ON public.offers USING btree (property_id)
- Index: `idx_offers_buyer`
  - CREATE INDEX idx_offers_buyer ON public.offers USING btree (buyer_id)
- Index: `idx_offers_status`
  - CREATE INDEX idx_offers_status ON public.offers USING btree (status)
- Index: `idx_offers_expires`
  - CREATE INDEX idx_offers_expires ON public.offers USING btree (expires_at) WHERE (status = 'PENDIN...
- Index: `idx_offers_parent`
  - CREATE INDEX idx_offers_parent ON public.offers USING btree (parent_offer_id) WHERE (parent_offer...
- Index: `idx_unique_pending_offer`
  - CREATE UNIQUE INDEX idx_unique_pending_offer ON public.offers USING btree (property_id, buyer_id)...
- Index: `idx_offers_visit`
  - CREATE INDEX idx_offers_visit ON public.offers USING btree (visit_id) WHERE (visit_id IS NOT NULL)


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `buyer_id` -> `users`.`id`
- `parent_offer_id` -> `offers`.`id`
- `visit_id` -> `visit_requests`.`id`


---

### Table: `payment_logs`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| transaction_id | uuid | YES | NULL |
| reservation_id | uuid | YES | NULL |
| payer_id | uuid | NO | NULL |
| amount | numeric | NO | NULL |
| payment_type | USER-DEFINED | NO | NULL |
| status | USER-DEFINED | NO | 'PENDING'::payment_status |
| payment_reference | text | YES | NULL |
| payment_method | text | YES | NULL |
| gateway_response | jsonb | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| completed_at | timestamp without time zone | YES | NULL |
| failed_at | timestamp without time zone | YES | NULL |
| error_message | text | YES | NULL |


**Constraints & Indexes:**

- Constraint: `chk_payment_amount_positive` (CHECK) on column `None`
- Constraint: `payment_logs_amount_not_null` (CHECK) on column `None`
- Constraint: `payment_logs_created_at_not_null` (CHECK) on column `None`
- Constraint: `payment_logs_id_not_null` (CHECK) on column `None`
- Constraint: `payment_logs_payer_id_fkey` (FOREIGN KEY) on column `payer_id`
- Constraint: `payment_logs_payer_id_not_null` (CHECK) on column `None`
- Constraint: `payment_logs_payment_type_not_null` (CHECK) on column `None`
- Constraint: `payment_logs_pkey` (PRIMARY KEY) on column `id`
- Constraint: `payment_logs_reservation_id_fkey` (FOREIGN KEY) on column `reservation_id`
- Constraint: `payment_logs_status_not_null` (CHECK) on column `None`
- Constraint: `payment_logs_transaction_id_fkey` (FOREIGN KEY) on column `transaction_id`
- Index: `payment_logs_pkey`
  - CREATE UNIQUE INDEX payment_logs_pkey ON public.payment_logs USING btree (id)
- Index: `idx_payment_logs_transaction`
  - CREATE INDEX idx_payment_logs_transaction ON public.payment_logs USING btree (transaction_id)
- Index: `idx_payment_logs_reservation`
  - CREATE INDEX idx_payment_logs_reservation ON public.payment_logs USING btree (reservation_id)
- Index: `idx_payment_logs_payer`
  - CREATE INDEX idx_payment_logs_payer ON public.payment_logs USING btree (payer_id)
- Index: `idx_payment_logs_status`
  - CREATE INDEX idx_payment_logs_status ON public.payment_logs USING btree (status)
- Index: `idx_payment_logs_type`
  - CREATE INDEX idx_payment_logs_type ON public.payment_logs USING btree (payment_type)


**Foreign Keys:**

- `transaction_id` -> `transactions`.`id`
- `reservation_id` -> `reservations`.`id`
- `payer_id` -> `users`.`id`


---

### Table: `properties`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| seller_id | uuid | NO | NULL |
| title | text | YES | NULL |
| description | text | YES | NULL |
| type | USER-DEFINED | YES | NULL |
| price | numeric | YES | NULL |
| latitude | double precision | YES | NULL |
| longitude | double precision | YES | NULL |
| address | text | YES | NULL |
| city | text | YES | NULL |
| bedrooms | integer | YES | NULL |
| bathrooms | integer | YES | NULL |
| area_sqft | numeric | YES | NULL |
| status | USER-DEFINED | NO | 'DRAFT'::property_status |
| version | integer | NO | 1 |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |
| submitted_at | timestamp without time zone | YES | NULL |
| verified_at | timestamp without time zone | YES | NULL |
| sold_at | timestamp without time zone | YES | NULL |
| deleted_at | timestamp without time zone | YES | NULL |
| state | text | YES | NULL |
| pincode | text | YES | NULL |
| property_sub_type | character varying | YES | NULL |
| floor_number | integer | YES | NULL |
| total_floors | integer | YES | NULL |
| balconies | integer | YES | 0 |
| furnishing_status | character varying | YES | NULL |
| facing_direction | character varying | YES | NULL |
| parking_available | boolean | YES | false |
| parking_count | integer | YES | 0 |
| road_access | boolean | YES | false |
| land_type | character varying | YES | NULL |
| price_negotiable | boolean | YES | true |
| maintenance_charges | numeric | YES | NULL |
| property_age_years | integer | YES | NULL |
| ownership_type | character varying | YES | NULL |
| availability_status | character varying | YES | 'READY_TO_MOVE'::character varying |
| amenities | jsonb | YES | '[]'::jsonb |


**Constraints & Indexes:**

- Constraint: `chk_area_positive` (CHECK) on column `None`
- Constraint: `chk_balconies_positive` (CHECK) on column `None`
- Constraint: `chk_bathrooms_positive` (CHECK) on column `None`
- Constraint: `chk_bedrooms_positive` (CHECK) on column `None`
- Constraint: `chk_floor_number_positive` (CHECK) on column `None`
- Constraint: `chk_maintenance_positive` (CHECK) on column `None`
- Constraint: `chk_parking_count_positive` (CHECK) on column `None`
- Constraint: `chk_price_positive` (CHECK) on column `None`
- Constraint: `chk_property_age_positive` (CHECK) on column `None`
- Constraint: `chk_total_floors_positive` (CHECK) on column `None`
- Constraint: `properties_created_at_not_null` (CHECK) on column `None`
- Constraint: `properties_id_not_null` (CHECK) on column `None`
- Constraint: `properties_pkey` (PRIMARY KEY) on column `id`
- Constraint: `properties_seller_id_fkey` (FOREIGN KEY) on column `seller_id`
- Constraint: `properties_seller_id_not_null` (CHECK) on column `None`
- Constraint: `properties_status_not_null` (CHECK) on column `None`
- Constraint: `properties_updated_at_not_null` (CHECK) on column `None`
- Constraint: `properties_version_not_null` (CHECK) on column `None`
- Index: `properties_pkey`
  - CREATE UNIQUE INDEX properties_pkey ON public.properties USING btree (id)
- Index: `idx_properties_seller_id`
  - CREATE INDEX idx_properties_seller_id ON public.properties USING btree (seller_id)
- Index: `idx_properties_status`
  - CREATE INDEX idx_properties_status ON public.properties USING btree (status)
- Index: `idx_properties_location`
  - CREATE INDEX idx_properties_location ON public.properties USING btree (latitude, longitude) WHERE...
- Index: `idx_properties_active`
  - CREATE INDEX idx_properties_active ON public.properties USING btree (status) WHERE ((status = 'AC...
- Index: `idx_properties_created_at`
  - CREATE INDEX idx_properties_created_at ON public.properties USING btree (created_at)
- Index: `idx_properties_pincode`
  - CREATE INDEX idx_properties_pincode ON public.properties USING btree (pincode) WHERE (pincode IS ...
- Index: `idx_properties_sub_type`
  - CREATE INDEX idx_properties_sub_type ON public.properties USING btree (property_sub_type) WHERE (...
- Index: `idx_properties_furnishing`
  - CREATE INDEX idx_properties_furnishing ON public.properties USING btree (furnishing_status) WHERE...
- Index: `idx_properties_availability`
  - CREATE INDEX idx_properties_availability ON public.properties USING btree (availability_status) W...
- Index: `idx_properties_amenities`
  - CREATE INDEX idx_properties_amenities ON public.properties USING gin (amenities) WHERE (amenities...


**Foreign Keys:**

- `seller_id` -> `users`.`id`


---

### Table: `property_document_requirements`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_type | USER-DEFINED | NO | NULL |
| document_type_id | uuid | YES | NULL |
| required | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `property_document_requirement_property_type_document_type_i_key` (UNIQUE) on column `property_type`
- Constraint: `property_document_requirement_property_type_document_type_i_key` (UNIQUE) on column `document_type_id`
- Constraint: `property_document_requirements_document_type_id_fkey` (FOREIGN KEY) on column `document_type_id`
- Constraint: `property_document_requirements_id_not_null` (CHECK) on column `None`
- Constraint: `property_document_requirements_pkey` (PRIMARY KEY) on column `id`
- Constraint: `property_document_requirements_property_type_not_null` (CHECK) on column `None`
- Index: `property_document_requirements_pkey`
  - CREATE UNIQUE INDEX property_document_requirements_pkey ON public.property_document_requirements ...
- Index: `property_document_requirement_property_type_document_type_i_key`
  - CREATE UNIQUE INDEX property_document_requirement_property_type_document_type_i_key ON public.pro...


**Foreign Keys:**

- `document_type_id` -> `verification_document_types`.`id`


---

### Table: `property_document_verifications`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| verification_id | uuid | NO | NULL |
| document_type_id | uuid | NO | NULL |
| verified | boolean | YES | false |
| document_image_url | text | YES | NULL |
| metadata | jsonb | YES | NULL |
| notes | text | YES | NULL |
| verified_by | uuid | YES | NULL |
| created_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `property_document_verificatio_verification_id_document_type_key` (UNIQUE) on column `verification_id`
- Constraint: `property_document_verificatio_verification_id_document_type_key` (UNIQUE) on column `document_type_id`
- Constraint: `property_document_verifications_document_type_id_fkey` (FOREIGN KEY) on column `document_type_id`
- Constraint: `property_document_verifications_document_type_id_not_null` (CHECK) on column `None`
- Constraint: `property_document_verifications_id_not_null` (CHECK) on column `None`
- Constraint: `property_document_verifications_pkey` (PRIMARY KEY) on column `id`
- Constraint: `property_document_verifications_verification_id_fkey` (FOREIGN KEY) on column `verification_id`
- Constraint: `property_document_verifications_verification_id_not_null` (CHECK) on column `None`
- Constraint: `property_document_verifications_verified_by_fkey` (FOREIGN KEY) on column `verified_by`
- Index: `property_document_verifications_pkey`
  - CREATE UNIQUE INDEX property_document_verifications_pkey ON public.property_document_verification...
- Index: `property_document_verificatio_verification_id_document_type_key`
  - CREATE UNIQUE INDEX property_document_verificatio_verification_id_document_type_key ON public.pro...


**Foreign Keys:**

- `verification_id` -> `property_verifications`.`id`
- `document_type_id` -> `verification_document_types`.`id`
- `verified_by` -> `users`.`id`


---

### Table: `property_fraud_signals`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| signal_type | text | NO | NULL |
| severity | text | NO | NULL |
| description | text | YES | NULL |
| detected_by | text | NO | NULL |
| resolved | boolean | YES | false |
| resolved_at | timestamp without time zone | YES | NULL |
| resolved_by | uuid | YES | NULL |
| resolution_notes | text | YES | NULL |
| created_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `property_fraud_signals_detected_by_not_null` (CHECK) on column `None`
- Constraint: `property_fraud_signals_id_not_null` (CHECK) on column `None`
- Constraint: `property_fraud_signals_pkey` (PRIMARY KEY) on column `id`
- Constraint: `property_fraud_signals_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `property_fraud_signals_property_id_not_null` (CHECK) on column `None`
- Constraint: `property_fraud_signals_resolved_by_fkey` (FOREIGN KEY) on column `resolved_by`
- Constraint: `property_fraud_signals_severity_not_null` (CHECK) on column `None`
- Constraint: `property_fraud_signals_signal_type_not_null` (CHECK) on column `None`
- Index: `property_fraud_signals_pkey`
  - CREATE UNIQUE INDEX property_fraud_signals_pkey ON public.property_fraud_signals USING btree (id)


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `resolved_by` -> `users`.`id`


---

### Table: `property_highlights`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| property_id | uuid | NO | NULL |
| facing | character varying | YES | NULL |
| floor_number | integer | YES | NULL |
| total_floors | integer | YES | NULL |
| furnishing | character varying | YES | NULL |
| possession_date | date | YES | NULL |
| property_age | integer | YES | NULL |
| parking_spaces | integer | YES | NULL |
| balconies | integer | YES | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `property_highlights_created_at_not_null` (CHECK) on column `None`
- Constraint: `property_highlights_id_not_null` (CHECK) on column `None`
- Constraint: `property_highlights_pkey` (PRIMARY KEY) on column `id`
- Constraint: `property_highlights_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `property_highlights_property_id_key` (UNIQUE) on column `property_id`
- Constraint: `property_highlights_property_id_not_null` (CHECK) on column `None`
- Constraint: `property_highlights_updated_at_not_null` (CHECK) on column `None`
- Index: `property_highlights_pkey`
  - CREATE UNIQUE INDEX property_highlights_pkey ON public.property_highlights USING btree (id)
- Index: `property_highlights_property_id_key`
  - CREATE UNIQUE INDEX property_highlights_property_id_key ON public.property_highlights USING btree...
- Index: `idx_property_highlights_property`
  - CREATE INDEX idx_property_highlights_property ON public.property_highlights USING btree (property...


**Foreign Keys:**

- `property_id` -> `properties`.`id`


---

### Table: `property_media`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| media_type | USER-DEFINED | NO | NULL |
| file_url | text | NO | NULL |
| file_size_bytes | bigint | YES | NULL |
| original_filename | text | YES | NULL |
| display_order | integer | NO | 0 |
| is_primary | boolean | NO | false |
| uploaded_at | timestamp without time zone | NO | now() |
| uploaded_by | uuid | NO | NULL |
| deleted_at | timestamp without time zone | YES | NULL |


**Constraints & Indexes:**

- Constraint: `property_media_display_order_not_null` (CHECK) on column `None`
- Constraint: `property_media_file_url_not_null` (CHECK) on column `None`
- Constraint: `property_media_id_not_null` (CHECK) on column `None`
- Constraint: `property_media_is_primary_not_null` (CHECK) on column `None`
- Constraint: `property_media_media_type_not_null` (CHECK) on column `None`
- Constraint: `property_media_pkey` (PRIMARY KEY) on column `id`
- Constraint: `property_media_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `property_media_property_id_not_null` (CHECK) on column `None`
- Constraint: `property_media_uploaded_at_not_null` (CHECK) on column `None`
- Constraint: `property_media_uploaded_by_fkey` (FOREIGN KEY) on column `uploaded_by`
- Constraint: `property_media_uploaded_by_not_null` (CHECK) on column `None`
- Index: `property_media_pkey`
  - CREATE UNIQUE INDEX property_media_pkey ON public.property_media USING btree (id)
- Index: `idx_property_media_property_id`
  - CREATE INDEX idx_property_media_property_id ON public.property_media USING btree (property_id)
- Index: `idx_property_media_active`
  - CREATE INDEX idx_property_media_active ON public.property_media USING btree (property_id) WHERE (...
- Index: `idx_property_media_primary`
  - CREATE INDEX idx_property_media_primary ON public.property_media USING btree (property_id) WHERE ...


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `uploaded_by` -> `users`.`id`


---

### Table: `property_price_history`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| property_id | uuid | NO | NULL |
| old_price | numeric | YES | NULL |
| new_price | numeric | NO | NULL |
| changed_at | timestamp with time zone | NO | now() |
| changed_by | uuid | YES | NULL |


**Constraints & Indexes:**

- Constraint: `property_price_history_changed_at_not_null` (CHECK) on column `None`
- Constraint: `property_price_history_changed_by_fkey` (FOREIGN KEY) on column `changed_by`
- Constraint: `property_price_history_id_not_null` (CHECK) on column `None`
- Constraint: `property_price_history_new_price_not_null` (CHECK) on column `None`
- Constraint: `property_price_history_pkey` (PRIMARY KEY) on column `id`
- Constraint: `property_price_history_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `property_price_history_property_id_not_null` (CHECK) on column `None`
- Index: `property_price_history_pkey`
  - CREATE UNIQUE INDEX property_price_history_pkey ON public.property_price_history USING btree (id)
- Index: `idx_price_history_property`
  - CREATE INDEX idx_price_history_property ON public.property_price_history USING btree (property_id...


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `changed_by` -> `users`.`id`


---

### Table: `property_trust_scores`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| property_id | uuid | NO | NULL |
| owner_verified | boolean | YES | false |
| documents_verified | boolean | YES | false |
| agent_verified | boolean | YES | false |
| fraud_signals_count | integer | YES | 0 |
| active_disputes_count | integer | YES | 0 |
| trust_score | integer | YES | 0 |
| updated_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `property_trust_scores_pkey` (PRIMARY KEY) on column `property_id`
- Constraint: `property_trust_scores_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `property_trust_scores_property_id_not_null` (CHECK) on column `None`
- Index: `property_trust_scores_pkey`
  - CREATE UNIQUE INDEX property_trust_scores_pkey ON public.property_trust_scores USING btree (prope...


**Foreign Keys:**

- `property_id` -> `properties`.`id`


---

### Table: `property_verifications`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| agent_id | uuid | NO | NULL |
| started_at | timestamp without time zone | NO | now() |
| completed_at | timestamp without time zone | YES | NULL |
| agent_gps_lat | double precision | YES | NULL |
| agent_gps_lng | double precision | YES | NULL |
| gps_verified_at | timestamp without time zone | YES | NULL |
| result | USER-DEFINED | YES | NULL |
| rejection_reason | text | YES | NULL |
| notes | text | YES | NULL |
| seller_otp_verified | boolean | YES | false |
| seller_otp_verified_at | timestamp without time zone | YES | NULL |
| checklist | jsonb | YES | NULL |
| otp_code | text | YES | NULL |
| otp_expires_at | timestamp without time zone | YES | NULL |


**Constraints & Indexes:**

- Constraint: `property_verifications_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `property_verifications_agent_id_not_null` (CHECK) on column `None`
- Constraint: `property_verifications_id_not_null` (CHECK) on column `None`
- Constraint: `property_verifications_pkey` (PRIMARY KEY) on column `id`
- Constraint: `property_verifications_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `property_verifications_property_id_not_null` (CHECK) on column `None`
- Constraint: `property_verifications_started_at_not_null` (CHECK) on column `None`
- Index: `property_verifications_pkey`
  - CREATE UNIQUE INDEX property_verifications_pkey ON public.property_verifications USING btree (id)
- Index: `idx_property_verifications_property`
  - CREATE INDEX idx_property_verifications_property ON public.property_verifications USING btree (pr...
- Index: `idx_property_verifications_agent`
  - CREATE INDEX idx_property_verifications_agent ON public.property_verifications USING btree (agent...
- Index: `idx_property_verifications_pending`
  - CREATE INDEX idx_property_verifications_pending ON public.property_verifications USING btree (pro...


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `agent_id` -> `agent_profiles`.`user_id`


---

### Table: `property_views`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| property_id | uuid | NO | NULL |
| viewer_id | uuid | YES | NULL |
| ip_address | character varying | YES | NULL |
| viewed_at | timestamp with time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `property_views_id_not_null` (CHECK) on column `None`
- Constraint: `property_views_pkey` (PRIMARY KEY) on column `id`
- Constraint: `property_views_property_fk` (FOREIGN KEY) on column `property_id`
- Constraint: `property_views_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `property_views_property_id_not_null` (CHECK) on column `None`
- Constraint: `property_views_viewed_at_not_null` (CHECK) on column `None`
- Constraint: `property_views_viewer_id_fkey` (FOREIGN KEY) on column `viewer_id`
- Index: `property_views_pkey`
  - CREATE UNIQUE INDEX property_views_pkey ON public.property_views USING btree (id)
- Index: `idx_property_views_property_id`
  - CREATE INDEX idx_property_views_property_id ON public.property_views USING btree (property_id)
- Index: `idx_property_views_viewer_dedup`
  - CREATE INDEX idx_property_views_viewer_dedup ON public.property_views USING btree (property_id, v...
- Index: `idx_property_views_ip_dedup`
  - CREATE INDEX idx_property_views_ip_dedup ON public.property_views USING btree (property_id, ip_ad...
- Index: `idx_property_views_time`
  - CREATE INDEX idx_property_views_time ON public.property_views USING btree (property_id, viewed_at)


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `viewer_id` -> `users`.`id`
- `property_id` -> `properties`.`id`


---

### Table: `reservations`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| buyer_id | uuid | NO | NULL |
| offer_id | uuid | NO | NULL |
| amount | numeric | NO | NULL |
| property_price | numeric | NO | NULL |
| start_date | timestamp without time zone | NO | now() |
| end_date | timestamp without time zone | NO | NULL |
| status | USER-DEFINED | NO | 'ACTIVE'::reservation_status |
| cancelled_at | timestamp without time zone | YES | NULL |
| cancellation_reason | text | YES | NULL |
| refund_amount | numeric | YES | NULL |
| payment_reference | text | YES | NULL |
| payment_method | text | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |
| admin_verified_at | timestamp without time zone | YES | NULL |
| admin_verified_by | uuid | YES | NULL |
| admin_notes | text | YES | NULL |
| pdf_url | text | YES | NULL |
| verification_status | character varying | YES | 'PENDING'::character varying |
| proof_url | text | YES | NULL |
| proof_uploaded_at | timestamp without time zone | YES | NULL |
| proof_uploaded_by | uuid | YES | NULL |


**Constraints & Indexes:**

- Constraint: `chk_amount_positive` (CHECK) on column `None`
- Constraint: `chk_end_after_start` (CHECK) on column `None`
- Constraint: `chk_property_price_positive` (CHECK) on column `None`
- Constraint: `chk_verification_status` (CHECK) on column `None`
- Constraint: `reservations_admin_verified_by_fkey` (FOREIGN KEY) on column `admin_verified_by`
- Constraint: `reservations_amount_not_null` (CHECK) on column `None`
- Constraint: `reservations_buyer_id_fkey` (FOREIGN KEY) on column `buyer_id`
- Constraint: `reservations_buyer_id_not_null` (CHECK) on column `None`
- Constraint: `reservations_created_at_not_null` (CHECK) on column `None`
- Constraint: `reservations_end_date_not_null` (CHECK) on column `None`
- Constraint: `reservations_id_not_null` (CHECK) on column `None`
- Constraint: `reservations_offer_id_fkey` (FOREIGN KEY) on column `offer_id`
- Constraint: `reservations_offer_id_not_null` (CHECK) on column `None`
- Constraint: `reservations_pkey` (PRIMARY KEY) on column `id`
- Constraint: `reservations_proof_uploaded_by_fkey` (FOREIGN KEY) on column `proof_uploaded_by`
- Constraint: `reservations_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `reservations_property_id_not_null` (CHECK) on column `None`
- Constraint: `reservations_property_price_not_null` (CHECK) on column `None`
- Constraint: `reservations_start_date_not_null` (CHECK) on column `None`
- Constraint: `reservations_status_not_null` (CHECK) on column `None`
- Constraint: `reservations_updated_at_not_null` (CHECK) on column `None`
- Index: `reservations_pkey`
  - CREATE UNIQUE INDEX reservations_pkey ON public.reservations USING btree (id)
- Index: `idx_reservations_property`
  - CREATE INDEX idx_reservations_property ON public.reservations USING btree (property_id)
- Index: `idx_reservations_buyer`
  - CREATE INDEX idx_reservations_buyer ON public.reservations USING btree (buyer_id)
- Index: `idx_reservations_offer`
  - CREATE INDEX idx_reservations_offer ON public.reservations USING btree (offer_id)
- Index: `idx_reservations_status`
  - CREATE INDEX idx_reservations_status ON public.reservations USING btree (status)
- Index: `idx_reservations_end_date`
  - CREATE INDEX idx_reservations_end_date ON public.reservations USING btree (end_date) WHERE (statu...
- Index: `idx_unique_active_reservation`
  - CREATE UNIQUE INDEX idx_unique_active_reservation ON public.reservations USING btree (property_id...
- Index: `idx_reservations_verification`
  - CREATE INDEX idx_reservations_verification ON public.reservations USING btree (verification_statu...


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `buyer_id` -> `users`.`id`
- `offer_id` -> `offers`.`id`
- `admin_verified_by` -> `users`.`id`
- `proof_uploaded_by` -> `users`.`id`


---

### Table: `roles`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| name | USER-DEFINED | NO | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `roles_created_at_not_null` (CHECK) on column `None`
- Constraint: `roles_id_not_null` (CHECK) on column `None`
- Constraint: `roles_name_key` (UNIQUE) on column `name`
- Constraint: `roles_name_not_null` (CHECK) on column `None`
- Constraint: `roles_pkey` (PRIMARY KEY) on column `id`
- Index: `roles_pkey`
  - CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)
- Index: `roles_name_key`
  - CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name)


---

### Table: `saved_properties`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| property_id | uuid | NO | NULL |
| notes | text | YES | NULL |
| created_at | timestamp with time zone | YES | now() |
| saved_price | numeric | YES | NULL |


**Constraints & Indexes:**

- Constraint: `saved_properties_id_not_null` (CHECK) on column `None`
- Constraint: `saved_properties_pkey` (PRIMARY KEY) on column `id`
- Constraint: `saved_properties_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `saved_properties_property_id_not_null` (CHECK) on column `None`
- Constraint: `saved_properties_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Constraint: `saved_properties_user_id_not_null` (CHECK) on column `None`
- Constraint: `saved_properties_user_id_property_id_key` (UNIQUE) on column `user_id`
- Constraint: `saved_properties_user_id_property_id_key` (UNIQUE) on column `property_id`
- Index: `saved_properties_pkey`
  - CREATE UNIQUE INDEX saved_properties_pkey ON public.saved_properties USING btree (id)
- Index: `saved_properties_user_id_property_id_key`
  - CREATE UNIQUE INDEX saved_properties_user_id_property_id_key ON public.saved_properties USING btr...
- Index: `idx_saved_properties_user_id`
  - CREATE INDEX idx_saved_properties_user_id ON public.saved_properties USING btree (user_id)
- Index: `idx_saved_properties_property_id`
  - CREATE INDEX idx_saved_properties_property_id ON public.saved_properties USING btree (property_id)
- Index: `idx_saved_properties_user_property`
  - CREATE INDEX idx_saved_properties_user_property ON public.saved_properties USING btree (user_id, ...


**Foreign Keys:**

- `user_id` -> `users`.`id`
- `property_id` -> `properties`.`id`


---

### Table: `seller_settings`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| user_id | uuid | NO | NULL |
| email_offers | boolean | YES | true |
| email_visits | boolean | YES | true |
| email_messages | boolean | YES | true |
| email_marketing | boolean | YES | false |
| push_offers | boolean | YES | true |
| push_visits | boolean | YES | true |
| push_messages | boolean | YES | true |
| contact_phone_visible | boolean | YES | false |
| auto_respond_inquiries | boolean | YES | false |
| default_currency | character varying | YES | 'INR'::character varying |
| default_view | character varying | YES | 'grid'::character varying |
| timezone | character varying | YES | 'Asia/Kolkata'::character varying |
| updated_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `seller_settings_pkey` (PRIMARY KEY) on column `user_id`
- Constraint: `seller_settings_updated_at_not_null` (CHECK) on column `None`
- Constraint: `seller_settings_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Constraint: `seller_settings_user_id_not_null` (CHECK) on column `None`
- Index: `seller_settings_pkey`
  - CREATE UNIQUE INDEX seller_settings_pkey ON public.seller_settings USING btree (user_id)
- Index: `idx_seller_settings_user`
  - CREATE INDEX idx_seller_settings_user ON public.seller_settings USING btree (user_id)


**Foreign Keys:**

- `user_id` -> `users`.`id`


---

### Table: `sessions`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| session_id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | NO | NULL |
| refresh_token_hash | text | YES | NULL |
| expires_at | timestamp without time zone | NO | NULL |
| revoked_at | timestamp without time zone | YES | NULL |
| device_fingerprint | text | YES | NULL |
| last_ip | text | YES | NULL |
| token_family_id | uuid | NO | NULL |
| parent_token_hash | text | YES | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `sessions_created_at_not_null` (CHECK) on column `None`
- Constraint: `sessions_expires_at_not_null` (CHECK) on column `None`
- Constraint: `sessions_pkey` (PRIMARY KEY) on column `session_id`
- Constraint: `sessions_session_id_not_null` (CHECK) on column `None`
- Constraint: `sessions_token_family_id_not_null` (CHECK) on column `None`
- Constraint: `sessions_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Constraint: `sessions_user_id_not_null` (CHECK) on column `None`
- Index: `sessions_pkey`
  - CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (session_id)
- Index: `idx_sessions_user_id`
  - CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id)
- Index: `idx_sessions_token_family_id`
  - CREATE INDEX idx_sessions_token_family_id ON public.sessions USING btree (token_family_id)
- Index: `idx_sessions_expires_at`
  - CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at)
- Index: `idx_sessions_revoked_at`
  - CREATE INDEX idx_sessions_revoked_at ON public.sessions USING btree (revoked_at)


**Foreign Keys:**

- `user_id` -> `users`.`id`


---

### Table: `sla_breaches`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| deal_id | uuid | NO | NULL |
| deal_state | text | NO | NULL |
| breach_type | USER-DEFINED | NO | NULL |
| responsible_role | text | NO | NULL |
| responsible_user_id | uuid | YES | NULL |
| days_in_state | numeric | NO | NULL |
| sla_threshold_days | integer | NO | NULL |
| resolved_at | timestamp with time zone | YES | NULL |
| resolved_by | text | YES | NULL |
| created_at | timestamp with time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `sla_breaches_breach_type_not_null` (CHECK) on column `None`
- Constraint: `sla_breaches_created_at_not_null` (CHECK) on column `None`
- Constraint: `sla_breaches_days_in_state_not_null` (CHECK) on column `None`
- Constraint: `sla_breaches_deal_id_fkey` (FOREIGN KEY) on column `deal_id`
- Constraint: `sla_breaches_deal_id_not_null` (CHECK) on column `None`
- Constraint: `sla_breaches_deal_state_not_null` (CHECK) on column `None`
- Constraint: `sla_breaches_id_not_null` (CHECK) on column `None`
- Constraint: `sla_breaches_pkey` (PRIMARY KEY) on column `id`
- Constraint: `sla_breaches_responsible_role_not_null` (CHECK) on column `None`
- Constraint: `sla_breaches_responsible_user_id_fkey` (FOREIGN KEY) on column `responsible_user_id`
- Constraint: `sla_breaches_sla_threshold_days_not_null` (CHECK) on column `None`
- Constraint: `uq_sla_breach_deal_state_type` (UNIQUE) on column `deal_id`
- Constraint: `uq_sla_breach_deal_state_type` (UNIQUE) on column `deal_state`
- Constraint: `uq_sla_breach_deal_state_type` (UNIQUE) on column `breach_type`
- Index: `sla_breaches_pkey`
  - CREATE UNIQUE INDEX sla_breaches_pkey ON public.sla_breaches USING btree (id)
- Index: `uq_sla_breach_deal_state_type`
  - CREATE UNIQUE INDEX uq_sla_breach_deal_state_type ON public.sla_breaches USING btree (deal_id, de...
- Index: `idx_sla_breaches_deal`
  - CREATE INDEX idx_sla_breaches_deal ON public.sla_breaches USING btree (deal_id)
- Index: `idx_sla_breaches_unresolved`
  - CREATE INDEX idx_sla_breaches_unresolved ON public.sla_breaches USING btree (resolved_at) WHERE (...


**Foreign Keys:**

- `deal_id` -> `deals`.`id`
- `responsible_user_id` -> `users`.`id`


---

### Table: `sla_configs`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| deal_state | text | NO | NULL |
| max_days | integer | NO | 7 |
| notify_after_days | integer | NO | 3 |
| escalate_after_days | integer | NO | 7 |
| responsible_role | text | NO | 'AGENT'::text |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `chk_sla_days` (CHECK) on column `None`
- Constraint: `chk_sla_max` (CHECK) on column `None`
- Constraint: `sla_configs_created_at_not_null` (CHECK) on column `None`
- Constraint: `sla_configs_deal_state_key` (UNIQUE) on column `deal_state`
- Constraint: `sla_configs_deal_state_not_null` (CHECK) on column `None`
- Constraint: `sla_configs_escalate_after_days_not_null` (CHECK) on column `None`
- Constraint: `sla_configs_id_not_null` (CHECK) on column `None`
- Constraint: `sla_configs_is_active_not_null` (CHECK) on column `None`
- Constraint: `sla_configs_max_days_not_null` (CHECK) on column `None`
- Constraint: `sla_configs_notify_after_days_not_null` (CHECK) on column `None`
- Constraint: `sla_configs_pkey` (PRIMARY KEY) on column `id`
- Constraint: `sla_configs_responsible_role_not_null` (CHECK) on column `None`
- Constraint: `sla_configs_updated_at_not_null` (CHECK) on column `None`
- Index: `sla_configs_pkey`
  - CREATE UNIQUE INDEX sla_configs_pkey ON public.sla_configs USING btree (id)
- Index: `sla_configs_deal_state_key`
  - CREATE UNIQUE INDEX sla_configs_deal_state_key ON public.sla_configs USING btree (deal_state)


---

### Table: `transaction_documents`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| transaction_id | uuid | NO | NULL |
| uploader_id | uuid | NO | NULL |
| uploader_role | character varying | NO | NULL |
| document_type | character varying | NO | NULL |
| file_url | text | NO | NULL |
| file_name | text | YES | NULL |
| admin_verified | boolean | YES | false |
| admin_verified_by | uuid | YES | NULL |
| admin_verified_at | timestamp without time zone | YES | NULL |
| admin_notes | text | YES | NULL |
| uploaded_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `transaction_documents_admin_verified_by_fkey` (FOREIGN KEY) on column `admin_verified_by`
- Constraint: `transaction_documents_document_type_check` (CHECK) on column `None`
- Constraint: `transaction_documents_document_type_not_null` (CHECK) on column `None`
- Constraint: `transaction_documents_file_url_not_null` (CHECK) on column `None`
- Constraint: `transaction_documents_id_not_null` (CHECK) on column `None`
- Constraint: `transaction_documents_pkey` (PRIMARY KEY) on column `id`
- Constraint: `transaction_documents_transaction_id_fkey` (FOREIGN KEY) on column `transaction_id`
- Constraint: `transaction_documents_transaction_id_not_null` (CHECK) on column `None`
- Constraint: `transaction_documents_uploaded_at_not_null` (CHECK) on column `None`
- Constraint: `transaction_documents_uploader_id_fkey` (FOREIGN KEY) on column `uploader_id`
- Constraint: `transaction_documents_uploader_id_not_null` (CHECK) on column `None`
- Constraint: `transaction_documents_uploader_role_check` (CHECK) on column `None`
- Constraint: `transaction_documents_uploader_role_not_null` (CHECK) on column `None`
- Index: `transaction_documents_pkey`
  - CREATE UNIQUE INDEX transaction_documents_pkey ON public.transaction_documents USING btree (id)
- Index: `idx_transaction_documents_transaction`
  - CREATE INDEX idx_transaction_documents_transaction ON public.transaction_documents USING btree (t...
- Index: `idx_transaction_documents_type`
  - CREATE INDEX idx_transaction_documents_type ON public.transaction_documents USING btree (document...
- Index: `idx_transaction_documents_verified`
  - CREATE INDEX idx_transaction_documents_verified ON public.transaction_documents USING btree (admi...


**Foreign Keys:**

- `transaction_id` -> `transactions`.`id`
- `uploader_id` -> `users`.`id`
- `admin_verified_by` -> `users`.`id`


---

### Table: `transactions`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| reservation_id | uuid | NO | NULL |
| buyer_id | uuid | NO | NULL |
| seller_id | uuid | NO | NULL |
| agent_id | uuid | NO | NULL |
| total_price | numeric | NO | NULL |
| reservation_amount | numeric | NO | NULL |
| commission_amount | numeric | NO | NULL |
| platform_fee | numeric | NO | NULL |
| agent_commission | numeric | NO | NULL |
| status | USER-DEFINED | NO | 'INITIATED'::transaction_status |
| registration_date | timestamp without time zone | YES | NULL |
| registration_location | text | YES | NULL |
| buyer_otp_hash | text | YES | NULL |
| buyer_otp_expires_at | timestamp without time zone | YES | NULL |
| buyer_otp_verified_at | timestamp without time zone | YES | NULL |
| seller_otp_hash | text | YES | NULL |
| seller_otp_expires_at | timestamp without time zone | YES | NULL |
| seller_otp_verified_at | timestamp without time zone | YES | NULL |
| agent_gps_lat | double precision | YES | NULL |
| agent_gps_lng | double precision | YES | NULL |
| agent_gps_verified_at | timestamp without time zone | YES | NULL |
| completed_at | timestamp without time zone | YES | NULL |
| failure_reason | text | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |
| registration_time | time without time zone | YES | NULL |
| office_name | text | YES | NULL |
| office_lat | double precision | YES | NULL |
| office_lng | double precision | YES | NULL |
| booking_reference | text | YES | NULL |
| slot_booked_at | timestamp without time zone | YES | NULL |
| slot_booked_by | uuid | YES | NULL |
| buyer_signed_at | timestamp without time zone | YES | NULL |
| seller_signed_at | timestamp without time zone | YES | NULL |
| agent_signed_at | timestamp without time zone | YES | NULL |
| agreement_pdf_url | text | YES | NULL |
| seller_payment_reference | text | YES | NULL |
| seller_payment_method | text | YES | NULL |
| seller_paid_at | timestamp without time zone | YES | NULL |
| agent_disbursement_reference | text | YES | NULL |
| agent_disbursed_at | timestamp without time zone | YES | NULL |
| admin_approved_by | uuid | YES | NULL |
| admin_approved_at | timestamp without time zone | YES | NULL |
| admin_notes | text | YES | NULL |


**Constraints & Indexes:**

- Constraint: `chk_different_parties` (CHECK) on column `None`
- Constraint: `chk_total_price_positive` (CHECK) on column `None`
- Constraint: `transactions_admin_approved_by_fkey` (FOREIGN KEY) on column `admin_approved_by`
- Constraint: `transactions_agent_commission_not_null` (CHECK) on column `None`
- Constraint: `transactions_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `transactions_agent_id_not_null` (CHECK) on column `None`
- Constraint: `transactions_buyer_id_fkey` (FOREIGN KEY) on column `buyer_id`
- Constraint: `transactions_buyer_id_not_null` (CHECK) on column `None`
- Constraint: `transactions_commission_amount_not_null` (CHECK) on column `None`
- Constraint: `transactions_created_at_not_null` (CHECK) on column `None`
- Constraint: `transactions_id_not_null` (CHECK) on column `None`
- Constraint: `transactions_pkey` (PRIMARY KEY) on column `id`
- Constraint: `transactions_platform_fee_not_null` (CHECK) on column `None`
- Constraint: `transactions_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `transactions_property_id_not_null` (CHECK) on column `None`
- Constraint: `transactions_reservation_amount_not_null` (CHECK) on column `None`
- Constraint: `transactions_reservation_id_fkey` (FOREIGN KEY) on column `reservation_id`
- Constraint: `transactions_reservation_id_not_null` (CHECK) on column `None`
- Constraint: `transactions_seller_id_fkey` (FOREIGN KEY) on column `seller_id`
- Constraint: `transactions_seller_id_not_null` (CHECK) on column `None`
- Constraint: `transactions_slot_booked_by_fkey` (FOREIGN KEY) on column `slot_booked_by`
- Constraint: `transactions_status_not_null` (CHECK) on column `None`
- Constraint: `transactions_total_price_not_null` (CHECK) on column `None`
- Constraint: `transactions_updated_at_not_null` (CHECK) on column `None`
- Index: `transactions_pkey`
  - CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id)
- Index: `idx_transactions_property`
  - CREATE INDEX idx_transactions_property ON public.transactions USING btree (property_id)
- Index: `idx_transactions_reservation`
  - CREATE INDEX idx_transactions_reservation ON public.transactions USING btree (reservation_id)
- Index: `idx_transactions_buyer`
  - CREATE INDEX idx_transactions_buyer ON public.transactions USING btree (buyer_id)
- Index: `idx_transactions_seller`
  - CREATE INDEX idx_transactions_seller ON public.transactions USING btree (seller_id)
- Index: `idx_transactions_agent`
  - CREATE INDEX idx_transactions_agent ON public.transactions USING btree (agent_id)
- Index: `idx_transactions_status`
  - CREATE INDEX idx_transactions_status ON public.transactions USING btree (status)
- Index: `idx_transactions_registration_date`
  - CREATE INDEX idx_transactions_registration_date ON public.transactions USING btree (registration_...
- Index: `idx_unique_reservation_transaction`
  - CREATE UNIQUE INDEX idx_unique_reservation_transaction ON public.transactions USING btree (reserv...


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `reservation_id` -> `reservations`.`id`
- `buyer_id` -> `users`.`id`
- `seller_id` -> `users`.`id`
- `agent_id` -> `agent_profiles`.`user_id`
- `slot_booked_by` -> `users`.`id`
- `admin_approved_by` -> `users`.`id`


---

### Table: `user_roles`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | NO | NULL |
| role_id | uuid | NO | NULL |
| assigned_at | timestamp without time zone | NO | now() |
| status | USER-DEFINED | NO | 'ACTIVE'::user_status |
| metadata | jsonb | YES | '{}'::jsonb |


**Constraints & Indexes:**

- Constraint: `user_roles_assigned_at_not_null` (CHECK) on column `None`
- Constraint: `user_roles_id_not_null` (CHECK) on column `None`
- Constraint: `user_roles_pkey` (PRIMARY KEY) on column `id`
- Constraint: `user_roles_role_id_fkey` (FOREIGN KEY) on column `role_id`
- Constraint: `user_roles_role_id_not_null` (CHECK) on column `None`
- Constraint: `user_roles_status_not_null` (CHECK) on column `None`
- Constraint: `user_roles_user_id_fkey` (FOREIGN KEY) on column `user_id`
- Constraint: `user_roles_user_id_not_null` (CHECK) on column `None`
- Constraint: `user_roles_user_id_role_id_key` (UNIQUE) on column `user_id`
- Constraint: `user_roles_user_id_role_id_key` (UNIQUE) on column `role_id`
- Index: `user_roles_pkey`
  - CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id)
- Index: `user_roles_user_id_role_id_key`
  - CREATE UNIQUE INDEX user_roles_user_id_role_id_key ON public.user_roles USING btree (user_id, rol...
- Index: `idx_user_roles_user_id`
  - CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id)
- Index: `idx_user_roles_role_id`
  - CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id)


**Foreign Keys:**

- `user_id` -> `users`.`id`
- `role_id` -> `roles`.`id`


---

### Table: `users`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| full_name | text | NO | NULL |
| email | text | NO | NULL |
| mobile_number | text | YES | NULL |
| password_hash | text | NO | NULL |
| status | USER-DEFINED | NO | 'PENDING_VERIFICATION'::user_status |
| login_attempts | integer | NO | 0 |
| login_locked_until | timestamp without time zone | YES | NULL |
| email_verified_at | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| latitude | double precision | YES | NULL |
| longitude | double precision | YES | NULL |
| address | text | YES | NULL |


**Constraints & Indexes:**

- Constraint: `chk_login_attempts_positive` (CHECK) on column `None`
- Constraint: `users_created_at_not_null` (CHECK) on column `None`
- Constraint: `users_email_key` (UNIQUE) on column `email`
- Constraint: `users_email_not_null` (CHECK) on column `None`
- Constraint: `users_full_name_not_null` (CHECK) on column `None`
- Constraint: `users_id_not_null` (CHECK) on column `None`
- Constraint: `users_login_attempts_not_null` (CHECK) on column `None`
- Constraint: `users_password_hash_not_null` (CHECK) on column `None`
- Constraint: `users_pkey` (PRIMARY KEY) on column `id`
- Constraint: `users_status_not_null` (CHECK) on column `None`
- Index: `users_pkey`
  - CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)
- Index: `users_email_key`
  - CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)
- Index: `idx_users_email`
  - CREATE INDEX idx_users_email ON public.users USING btree (email)
- Index: `idx_users_status`
  - CREATE INDEX idx_users_status ON public.users USING btree (status)


---

### Table: `verification_audit_logs`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| verification_id | uuid | NO | NULL |
| event_type | text | NO | NULL |
| event_data | jsonb | YES | NULL |
| performed_by | uuid | YES | NULL |
| ip_address | inet | YES | NULL |
| created_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `verification_audit_logs_event_type_not_null` (CHECK) on column `None`
- Constraint: `verification_audit_logs_id_not_null` (CHECK) on column `None`
- Constraint: `verification_audit_logs_performed_by_fkey` (FOREIGN KEY) on column `performed_by`
- Constraint: `verification_audit_logs_pkey` (PRIMARY KEY) on column `id`
- Constraint: `verification_audit_logs_verification_id_fkey` (FOREIGN KEY) on column `verification_id`
- Constraint: `verification_audit_logs_verification_id_not_null` (CHECK) on column `None`
- Index: `verification_audit_logs_pkey`
  - CREATE UNIQUE INDEX verification_audit_logs_pkey ON public.verification_audit_logs USING btree (id)


**Foreign Keys:**

- `verification_id` -> `property_verifications`.`id`
- `performed_by` -> `users`.`id`


---

### Table: `verification_checklist_items`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| code | text | NO | NULL |
| name | text | NO | NULL |
| category | text | YES | NULL |
| created_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `verification_checklist_items_code_key` (UNIQUE) on column `code`
- Constraint: `verification_checklist_items_code_not_null` (CHECK) on column `None`
- Constraint: `verification_checklist_items_id_not_null` (CHECK) on column `None`
- Constraint: `verification_checklist_items_name_not_null` (CHECK) on column `None`
- Constraint: `verification_checklist_items_pkey` (PRIMARY KEY) on column `id`
- Index: `verification_checklist_items_pkey`
  - CREATE UNIQUE INDEX verification_checklist_items_pkey ON public.verification_checklist_items USIN...
- Index: `verification_checklist_items_code_key`
  - CREATE UNIQUE INDEX verification_checklist_items_code_key ON public.verification_checklist_items ...


---

### Table: `verification_checklist_results`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| verification_id | uuid | NO | NULL |
| checklist_item_id | uuid | NO | NULL |
| result | boolean | YES | NULL |
| notes | text | YES | NULL |
| created_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `verification_checklist_result_verification_id_checklist_ite_key` (UNIQUE) on column `verification_id`
- Constraint: `verification_checklist_result_verification_id_checklist_ite_key` (UNIQUE) on column `checklist_item_id`
- Constraint: `verification_checklist_results_checklist_item_id_fkey` (FOREIGN KEY) on column `checklist_item_id`
- Constraint: `verification_checklist_results_checklist_item_id_not_null` (CHECK) on column `None`
- Constraint: `verification_checklist_results_id_not_null` (CHECK) on column `None`
- Constraint: `verification_checklist_results_pkey` (PRIMARY KEY) on column `id`
- Constraint: `verification_checklist_results_verification_id_fkey` (FOREIGN KEY) on column `verification_id`
- Constraint: `verification_checklist_results_verification_id_not_null` (CHECK) on column `None`
- Index: `verification_checklist_results_pkey`
  - CREATE UNIQUE INDEX verification_checklist_results_pkey ON public.verification_checklist_results ...
- Index: `verification_checklist_result_verification_id_checklist_ite_key`
  - CREATE UNIQUE INDEX verification_checklist_result_verification_id_checklist_ite_key ON public.ver...


**Foreign Keys:**

- `verification_id` -> `property_verifications`.`id`
- `checklist_item_id` -> `verification_checklist_items`.`id`


---

### Table: `verification_document_types`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| code | text | NO | NULL |
| name | text | NO | NULL |
| description | text | YES | NULL |
| required | boolean | YES | false |
| created_at | timestamp without time zone | YES | now() |


**Constraints & Indexes:**

- Constraint: `verification_document_types_code_key` (UNIQUE) on column `code`
- Constraint: `verification_document_types_code_not_null` (CHECK) on column `None`
- Constraint: `verification_document_types_id_not_null` (CHECK) on column `None`
- Constraint: `verification_document_types_name_not_null` (CHECK) on column `None`
- Constraint: `verification_document_types_pkey` (PRIMARY KEY) on column `id`
- Index: `verification_document_types_pkey`
  - CREATE UNIQUE INDEX verification_document_types_pkey ON public.verification_document_types USING ...
- Index: `verification_document_types_code_key`
  - CREATE UNIQUE INDEX verification_document_types_code_key ON public.verification_document_types US...


---

### Table: `visit_feedback_agent`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| visit_id | uuid | NO | NULL |
| buyer_interest_level | integer | YES | NULL |
| buyer_perceived_budget | character varying | YES | NULL |
| property_condition_notes | text | YES | NULL |
| buyer_questions | text | YES | NULL |
| follow_up_required | boolean | YES | false |
| recommended_action | character varying | YES | NULL |
| additional_notes | text | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `visit_feedback_agent_buyer_interest_level_check` (CHECK) on column `None`
- Constraint: `visit_feedback_agent_created_at_not_null` (CHECK) on column `None`
- Constraint: `visit_feedback_agent_id_not_null` (CHECK) on column `None`
- Constraint: `visit_feedback_agent_pkey` (PRIMARY KEY) on column `id`
- Constraint: `visit_feedback_agent_updated_at_not_null` (CHECK) on column `None`
- Constraint: `visit_feedback_agent_visit_id_fkey` (FOREIGN KEY) on column `visit_id`
- Constraint: `visit_feedback_agent_visit_id_key` (UNIQUE) on column `visit_id`
- Constraint: `visit_feedback_agent_visit_id_not_null` (CHECK) on column `None`
- Index: `visit_feedback_agent_pkey`
  - CREATE UNIQUE INDEX visit_feedback_agent_pkey ON public.visit_feedback_agent USING btree (id)
- Index: `visit_feedback_agent_visit_id_key`
  - CREATE UNIQUE INDEX visit_feedback_agent_visit_id_key ON public.visit_feedback_agent USING btree ...
- Index: `idx_visit_feedback_agent_visit`
  - CREATE INDEX idx_visit_feedback_agent_visit ON public.visit_feedback_agent USING btree (visit_id)


**Foreign Keys:**

- `visit_id` -> `visit_requests`.`id`


---

### Table: `visit_feedback_buyer`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| visit_id | uuid | NO | NULL |
| overall_rating | integer | YES | NULL |
| agent_professionalism | integer | YES | NULL |
| property_condition_rating | integer | YES | NULL |
| property_as_described | boolean | YES | NULL |
| interest_level | character varying | YES | NULL |
| liked_aspects | text | YES | NULL |
| concerns | text | YES | NULL |
| would_recommend | boolean | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `visit_feedback_buyer_agent_professionalism_check` (CHECK) on column `None`
- Constraint: `visit_feedback_buyer_created_at_not_null` (CHECK) on column `None`
- Constraint: `visit_feedback_buyer_id_not_null` (CHECK) on column `None`
- Constraint: `visit_feedback_buyer_overall_rating_check` (CHECK) on column `None`
- Constraint: `visit_feedback_buyer_pkey` (PRIMARY KEY) on column `id`
- Constraint: `visit_feedback_buyer_property_condition_rating_check` (CHECK) on column `None`
- Constraint: `visit_feedback_buyer_updated_at_not_null` (CHECK) on column `None`
- Constraint: `visit_feedback_buyer_visit_id_fkey` (FOREIGN KEY) on column `visit_id`
- Constraint: `visit_feedback_buyer_visit_id_key` (UNIQUE) on column `visit_id`
- Constraint: `visit_feedback_buyer_visit_id_not_null` (CHECK) on column `None`
- Index: `visit_feedback_buyer_pkey`
  - CREATE UNIQUE INDEX visit_feedback_buyer_pkey ON public.visit_feedback_buyer USING btree (id)
- Index: `visit_feedback_buyer_visit_id_key`
  - CREATE UNIQUE INDEX visit_feedback_buyer_visit_id_key ON public.visit_feedback_buyer USING btree ...
- Index: `idx_visit_feedback_buyer_visit`
  - CREATE INDEX idx_visit_feedback_buyer_visit ON public.visit_feedback_buyer USING btree (visit_id)


**Foreign Keys:**

- `visit_id` -> `visit_requests`.`id`


---

### Table: `visit_images`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| visit_id | uuid | NO | NULL |
| uploaded_by | uuid | NO | NULL |
| uploader_role | character varying | NO | NULL |
| image_type | character varying | YES | NULL |
| file_url | text | NO | NULL |
| file_name | character varying | YES | NULL |
| file_size | integer | YES | NULL |
| caption | text | YES | NULL |
| deleted_at | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `visit_images_created_at_not_null` (CHECK) on column `None`
- Constraint: `visit_images_file_url_not_null` (CHECK) on column `None`
- Constraint: `visit_images_id_not_null` (CHECK) on column `None`
- Constraint: `visit_images_pkey` (PRIMARY KEY) on column `id`
- Constraint: `visit_images_uploaded_by_fkey` (FOREIGN KEY) on column `uploaded_by`
- Constraint: `visit_images_uploaded_by_not_null` (CHECK) on column `None`
- Constraint: `visit_images_uploader_role_check` (CHECK) on column `None`
- Constraint: `visit_images_uploader_role_not_null` (CHECK) on column `None`
- Constraint: `visit_images_visit_id_fkey` (FOREIGN KEY) on column `visit_id`
- Constraint: `visit_images_visit_id_not_null` (CHECK) on column `None`
- Index: `visit_images_pkey`
  - CREATE UNIQUE INDEX visit_images_pkey ON public.visit_images USING btree (id)
- Index: `idx_visit_images_visit`
  - CREATE INDEX idx_visit_images_visit ON public.visit_images USING btree (visit_id)
- Index: `idx_visit_images_uploader`
  - CREATE INDEX idx_visit_images_uploader ON public.visit_images USING btree (uploaded_by)
- Index: `idx_visit_images_active`
  - CREATE INDEX idx_visit_images_active ON public.visit_images USING btree (visit_id) WHERE (deleted...


**Foreign Keys:**

- `visit_id` -> `visit_requests`.`id`
- `uploaded_by` -> `users`.`id`


---

### Table: `visit_otp`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| visit_id | uuid | NO | NULL |
| otp_code | character varying | NO | NULL |
| expires_at | timestamp without time zone | NO | NULL |
| created_at | timestamp without time zone | NO | now() |


**Constraints & Indexes:**

- Constraint: `chk_otp_code_length` (CHECK) on column `None`
- Constraint: `visit_otp_created_at_not_null` (CHECK) on column `None`
- Constraint: `visit_otp_expires_at_not_null` (CHECK) on column `None`
- Constraint: `visit_otp_id_not_null` (CHECK) on column `None`
- Constraint: `visit_otp_otp_code_not_null` (CHECK) on column `None`
- Constraint: `visit_otp_pkey` (PRIMARY KEY) on column `id`
- Constraint: `visit_otp_visit_id_fkey` (FOREIGN KEY) on column `visit_id`
- Constraint: `visit_otp_visit_id_not_null` (CHECK) on column `None`
- Index: `visit_otp_pkey`
  - CREATE UNIQUE INDEX visit_otp_pkey ON public.visit_otp USING btree (id)
- Index: `idx_visit_otp_visit`
  - CREATE INDEX idx_visit_otp_visit ON public.visit_otp USING btree (visit_id)
- Index: `idx_visit_otp_expires`
  - CREATE INDEX idx_visit_otp_expires ON public.visit_otp USING btree (expires_at)


**Foreign Keys:**

- `visit_id` -> `visit_requests`.`id`


---

### Table: `visit_requests`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| property_id | uuid | NO | NULL |
| buyer_id | uuid | NO | NULL |
| agent_id | uuid | NO | NULL |
| preferred_date | timestamp without time zone | NO | NULL |
| confirmed_date | timestamp without time zone | YES | NULL |
| status | USER-DEFINED | NO | 'REQUESTED'::visit_status |
| rejection_reason | text | YES | NULL |
| buyer_message | text | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |
| responded_at | timestamp without time zone | YES | NULL |
| counter_date | timestamp with time zone | YES | NULL |
| counter_message | text | YES | NULL |
| counter_by | uuid | YES | NULL |


**Constraints & Indexes:**

- Constraint: `chk_preferred_date_future` (CHECK) on column `None`
- Constraint: `visit_requests_agent_id_fkey` (FOREIGN KEY) on column `agent_id`
- Constraint: `visit_requests_agent_id_not_null` (CHECK) on column `None`
- Constraint: `visit_requests_buyer_id_fkey` (FOREIGN KEY) on column `buyer_id`
- Constraint: `visit_requests_buyer_id_not_null` (CHECK) on column `None`
- Constraint: `visit_requests_counter_by_fkey` (FOREIGN KEY) on column `counter_by`
- Constraint: `visit_requests_created_at_not_null` (CHECK) on column `None`
- Constraint: `visit_requests_id_not_null` (CHECK) on column `None`
- Constraint: `visit_requests_pkey` (PRIMARY KEY) on column `id`
- Constraint: `visit_requests_preferred_date_not_null` (CHECK) on column `None`
- Constraint: `visit_requests_property_id_fkey` (FOREIGN KEY) on column `property_id`
- Constraint: `visit_requests_property_id_not_null` (CHECK) on column `None`
- Constraint: `visit_requests_status_not_null` (CHECK) on column `None`
- Constraint: `visit_requests_updated_at_not_null` (CHECK) on column `None`
- Index: `idx_visit_requests_property`
  - CREATE INDEX idx_visit_requests_property ON public.visit_requests USING btree (property_id)
- Index: `visit_requests_pkey`
  - CREATE UNIQUE INDEX visit_requests_pkey ON public.visit_requests USING btree (id)
- Index: `idx_visit_requests_buyer`
  - CREATE INDEX idx_visit_requests_buyer ON public.visit_requests USING btree (buyer_id)
- Index: `idx_visit_requests_agent`
  - CREATE INDEX idx_visit_requests_agent ON public.visit_requests USING btree (agent_id)
- Index: `idx_visit_requests_status`
  - CREATE INDEX idx_visit_requests_status ON public.visit_requests USING btree (status)
- Index: `idx_visit_requests_date`
  - CREATE INDEX idx_visit_requests_date ON public.visit_requests USING btree (preferred_date)
- Index: `idx_unique_pending_visit`
  - CREATE UNIQUE INDEX idx_unique_pending_visit ON public.visit_requests USING btree (property_id, b...
- Index: `idx_visit_requests_counter_by`
  - CREATE INDEX idx_visit_requests_counter_by ON public.visit_requests USING btree (counter_by)


**Foreign Keys:**

- `property_id` -> `properties`.`id`
- `buyer_id` -> `users`.`id`
- `agent_id` -> `agent_profiles`.`user_id`
- `counter_by` -> `users`.`id`


---

### Table: `visit_verifications`

**Columns:**
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| visit_id | uuid | NO | NULL |
| agent_gps_lat | double precision | YES | NULL |
| agent_gps_lng | double precision | YES | NULL |
| gps_verified_at | timestamp without time zone | YES | NULL |
| gps_distance_meters | double precision | YES | NULL |
| completed_at | timestamp without time zone | YES | NULL |
| duration_minutes | integer | YES | NULL |
| agent_notes | text | YES | NULL |
| buyer_feedback | text | YES | NULL |
| buyer_rating | integer | YES | NULL |
| created_at | timestamp without time zone | NO | now() |
| otp_verified_at | timestamp without time zone | YES | NULL |


**Constraints & Indexes:**

- Constraint: `visit_verifications_buyer_rating_check` (CHECK) on column `None`
- Constraint: `visit_verifications_created_at_not_null` (CHECK) on column `None`
- Constraint: `visit_verifications_id_not_null` (CHECK) on column `None`
- Constraint: `visit_verifications_pkey` (PRIMARY KEY) on column `id`
- Constraint: `visit_verifications_visit_id_fkey` (FOREIGN KEY) on column `visit_id`
- Constraint: `visit_verifications_visit_id_not_null` (CHECK) on column `None`
- Index: `visit_verifications_pkey`
  - CREATE UNIQUE INDEX visit_verifications_pkey ON public.visit_verifications USING btree (id)
- Index: `idx_visit_verifications_visit`
  - CREATE INDEX idx_visit_verifications_visit ON public.visit_verifications USING btree (visit_id)
- Index: `idx_unique_visit_verification`
  - CREATE UNIQUE INDEX idx_unique_visit_verification ON public.visit_verifications USING btree (visi...


**Foreign Keys:**

- `visit_id` -> `visit_requests`.`id`


---

## Custom ENUM Types

### `agreement_status`
- DRAFT
- SIGNED
- VOID


### `agreement_type`
- COMMISSION
- SALE
- TOKEN


### `assignment_status`
- ACCEPTED
- CANCELLED
- COMPLETED
- DECLINED
- REQUESTED


### `deal_event_type`
- ADMIN_OVERRIDE
- AGREEMENT_ACCEPTED
- AGREEMENT_CREATED
- AGREEMENT_VOIDED
- CANCELLATION_REQUESTED
- CANCELLED
- COMMISSION_CALCULATED
- DEAL_CREATED
- DEAL_FROZEN
- DEAL_UNFROZEN
- DISPUTE_CREATED
- EXPIRED
- NOTE_ADDED
- OFFER_LINKED
- PRICE_UPDATED
- REFUND_REQUESTED
- RESERVATION_LINKED
- STATUS_CHANGED
- TOKEN_FORFEITED
- TRANSACTION_LINKED
- VISIT_LINKED


### `deal_status`
- AGREEMENT_SIGNED
- CANCELLED
- COMMISSION_RELEASED
- COMPLETED
- DISPUTED
- EXPIRED
- INITIATED
- NEGOTIATION
- OFFER_MADE
- PRICE_AGREED
- REGISTRATION
- TOKEN_PAID
- TOKEN_PENDING
- VISIT_SCHEDULED


### `dispute_category`
- AGENT_MISCONDUCT
- CANCELLATION
- OTHER
- PAYMENT_ISSUE
- PROPERTY_MISREPRESENTATION
- VERIFICATION_ISSUE
- VISIT_ISSUE


### `dispute_decision`
- FAVOR_AGENT
- FAVOR_BUYER
- FAVOR_SELLER
- NO_ACTION
- PARTIAL_REFUND


### `dispute_status`
- CLOSED
- OPEN
- RESOLVED
- UNDER_REVIEW


### `evidence_type`
- ADMIN_NOTE
- AGREEMENT
- COMMUNICATION
- OTHER
- PAYMENT_PROOF
- PHOTO


### `media_type`
- IMAGE
- VIDEO


### `notification_severity`
- CRITICAL
- INFO
- URGENT
- WARNING


### `offer_status`
- ACCEPTED
- COUNTERED
- EXPIRED
- PENDING
- REJECTED
- WITHDRAWN


### `payment_status`
- COMPLETED
- FAILED
- PENDING
- REFUNDED


### `payment_type`
- COMMISSION
- REFUND
- RESERVATION


### `property_status`
- ACTIVE
- ASSIGNED
- DRAFT
- INACTIVE
- PENDING_ASSIGNMENT
- RESERVED
- SOLD
- UNDER_DEAL
- VERIFICATION_IN_PROGRESS


### `property_type`
- APARTMENT
- COMMERCIAL
- HOUSE
- LAND


### `reservation_status`
- ACTIVE
- CANCELLED
- COMPLETED
- EXPIRED


### `sla_breach_type`
- ESCALATION
- WARNING


### `transaction_status`
- ADMIN_REVIEW
- ALL_VERIFIED
- BUYER_VERIFIED
- CANCELLED
- COMPLETED
- DOCUMENTS_PENDING
- FAILED
- INITIATED
- SELLER_PAID
- SELLER_VERIFIED
- SLOT_BOOKED


### `user_role`
- ADMIN
- AGENT
- BUYER
- SELLER
- USER


### `user_status`
- ACTIVE
- DECLINED
- IN_REVIEW
- PENDING_VERIFICATION
- SUSPENDED


### `verification_result`
- APPROVED
- REJECTED


### `visit_status`
- APPROVED
- CANCELLED
- CHECKED_IN
- COMPLETED
- COUNTERED
- NO_SHOW
- REJECTED
- REQUESTED

