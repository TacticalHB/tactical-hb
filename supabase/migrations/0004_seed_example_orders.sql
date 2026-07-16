-- =============================================================================
--  STEP 2 of 2 — example orders + line items. Run AFTER 0003.
--
--  Your email is already filled in below, so you can just paste + Run.
--  (If you ever seed a different account, change ONLY the text inside the
--   quotes on the marked line — don't touch the rest of the line.)
--
--  Everything lives inside one DO block on purpose: `select ... into uid` is
--  PL/pgSQL and only works in here, never as a top-level statement.
--
--  Inserting orders fires the loyalty trigger, so this also awards XP and
--  (24.40 + 50.30 + 43.80 = 118.50, crossing 100) issues a EUR 10 voucher.
--  Expected result: "Success. No rows returned."
-- =============================================================================

do $$
declare
  seed_email text := 'mariokiki109@gmail.com';   -- <<< only the text in quotes
  uid uuid;
  o1  uuid;
  o2  uuid;
  o3  uuid;
begin
  select id into uid from auth.users where email = seed_email limit 1;

  if uid is null then
    raise exception 'No user found with email %. Check Authentication -> Users for the exact address.', seed_email;
  end if;

  insert into public.orders (user_id, amount_eur, source, created_at)
  values (uid, 24.40, 'manual', now() - interval '30 days')
  returning id into o1;

  insert into public.order_items (order_id, product_id, product_name, quantity, price_eur)
  values
    (o1, 'hmd-a-craft', 'HMD A.Craft',     1, 12.00),
    (o1, 'bowl-killer', 'Tactical Killer', 2,  6.20);

  insert into public.orders (user_id, amount_eur, source, created_at)
  values (uid, 50.30, 'manual', now() - interval '10 days')
  returning id into o2;

  insert into public.order_items (order_id, product_id, product_name, quantity, price_eur)
  values
    (o2, 'hmd-tct-op',         'HMD TCT OP',             1, 21.00),
    (o2, 'bowl-phunnel',       'Tactical 0.66 FTP',      1,  7.30),
    (o2, 'windcover-bomb-cap', 'TCT Windcover Bomb Cap', 1, 22.00);

  insert into public.orders (user_id, amount_eur, source, created_at)
  values (uid, 43.80, 'manual', now() - interval '2 days')
  returning id into o3;

  insert into public.order_items (order_id, product_id, product_name, quantity, price_eur)
  values
    (o3, 'hmd-tct-classic',    'HMD TCT Classic',        1, 14.50),
    (o3, 'windcover-bomb-cap', 'TCT Windcover Bomb Cap', 1, 22.00),
    (o3, 'bowl-phunnel',       'Tactical 0.66 FTP',      1,  7.30);
end $$;
