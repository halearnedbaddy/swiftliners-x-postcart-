INSERT INTO public.user_roles (user_id, role)
VALUES ('87e7794b-b051-4f53-a1c4-37ba7569f2cb', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;