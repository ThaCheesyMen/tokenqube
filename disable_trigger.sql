-- Quick fix: Disable the trigger completely to allow signup to work
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
