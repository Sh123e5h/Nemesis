-- MODERATION SUITE
-- Functions for auditing and managing platform content

CREATE OR REPLACE FUNCTION public.admin_get_moderation_content(
  p_tab TEXT,
  p_search TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_results JSONB;
BEGIN
  IF p_tab = 'materials' THEN
    SELECT jsonb_agg(t)
    FROM (
      SELECT 
        sm.id, sm.title, sm.file_url, sm.file_type, sm.subject, sm.topic, sm.created_at,
        jsonb_build_object('full_name', p.full_name, 'username', p.username) as profiles
      FROM study_materials sm
      LEFT JOIN profiles p ON sm.user_id = p.id
      WHERE (p_search = '' OR sm.title ILIKE '%' || p_search || '%')
        AND sm.title <> 'Initial Directory Placeholder' -- Filter out system noise
      ORDER BY sm.created_at DESC
    ) t INTO v_results;

  ELSIF p_tab = 'groupFiles' THEN
    SELECT jsonb_agg(t)
    FROM (
      SELECT 
        f.id, f.file_name, f.file_url, f.file_size, f.created_at,
        jsonb_build_object('full_name', p.full_name) as profiles,
        jsonb_build_object('name', g.name) as groups
      FROM files f
      LEFT JOIN profiles p ON f.uploaded_by = p.id -- Fixed join column
      LEFT JOIN groups g ON f.group_id = g.id
      WHERE (p_search = '' OR f.file_name ILIKE '%' || p_search || '%')
        AND f.file_name <> 'Initial Directory Placeholder' -- Filter out system noise
      ORDER BY f.created_at DESC
    ) t INTO v_results;

  ELSIF p_tab = 'reports' THEN
    SELECT jsonb_agg(t)
    FROM (
      SELECT 
        r.*,
        jsonb_build_object('full_name', p.full_name, 'username', p.username) as profiles
      FROM reports r
      LEFT JOIN profiles p ON r.reporter_id = p.id -- Fixed join column
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    ) t INTO v_results;
  END IF;

  RETURN COALESCE(v_results, '[]'::jsonb);
END;
$function$;

-- MODERATION ACTION (Unified)
CREATE OR REPLACE FUNCTION public.admin_moderate_user(
  target_user_id uuid,
  action_type text,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_username text;
  v_reason text := 'Administrative action';
BEGIN
  -- We MUST find the username before deletion or any action
  SELECT username INTO v_username FROM public.profiles WHERE id = target_user_id;

  IF action_type = 'suspend' THEN
    UPDATE public.profiles SET status = 'suspended' WHERE id = target_user_id;
    INSERT INTO public.audit_logs (admin_id, action, target_id, target_type, metadata)
    VALUES (p_admin_id, 'USER_SUSPENDED', target_user_id, 'user', jsonb_build_object('username', v_username, 'reason', v_reason));

  ELSIF action_type = 'activate' THEN
    UPDATE public.profiles SET status = 'active' WHERE id = target_user_id;
    INSERT INTO public.audit_logs (admin_id, action, target_id, target_type, metadata)
    VALUES (p_admin_id, 'USER_ACTIVATED', target_user_id, 'user', jsonb_build_object('username', v_username));

  ELSIF action_type = 'delete' THEN
    DELETE FROM public.profiles WHERE id = target_user_id;
    INSERT INTO public.audit_logs (admin_id, action, target_id, target_type, metadata)
    VALUES (p_admin_id, 'USER_DELETED', target_user_id, 'user', jsonb_build_object('username', v_username, 'reason', v_reason));
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action type');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ANNOUNCEMENT MANAGEMENT (Type Safe)
CREATE OR REPLACE FUNCTION public.admin_manage_announcement(
  p_action text,
  p_id uuid DEFAULT NULL::uuid,
  p_is_active boolean DEFAULT NULL::boolean,
  p_admin_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_results JSONB;
BEGIN
  IF p_action = 'fetch' THEN
    SELECT jsonb_agg(sub) INTO v_results FROM (
      SELECT a.*, jsonb_build_object('email', au.email) as admin_users
      FROM public.announcements a
      LEFT JOIN admin_internal.admin_users au ON a.admin_id = au.id
      ORDER BY a.created_at DESC
    ) sub;
    RETURN COALESCE(v_results, '[]'::jsonb);

  ELSIF p_action = 'toggle' THEN
    UPDATE public.announcements SET is_active = NOT COALESCE(p_is_active, is_active) WHERE id = p_id;
    INSERT INTO public.audit_logs (admin_id, action, target_id, target_type)
    VALUES (p_admin_id, CASE WHEN p_is_active THEN 'ANNOUNCEMENT_DISABLED' ELSE 'ANNOUNCEMENT_ENABLED' END, p_id, 'announcement');
    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'delete' THEN
    DELETE FROM public.announcements WHERE id = p_id;
    INSERT INTO public.audit_logs (admin_id, action, target_id, target_type)
    VALUES (p_admin_id, 'ANNOUNCEMENT_DELETED', p_id, 'announcement');
    RETURN jsonb_build_object('success', true);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
END;
$function$;
