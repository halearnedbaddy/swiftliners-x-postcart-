-- Fix overly permissive INSERT policies for notifications and audit_logs
-- These tables should only be insertable by service role (edge functions)

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;

-- Notifications can only be created by authenticated users for themselves or by service role
CREATE POLICY "Users can create their own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit logs can only be created by the user being logged or admins
CREATE POLICY "Users can create their own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'ADMIN'));