-- Demo content: the accounts, posts, channels and statuses a new sign-up lands on.
-- These profiles have no auth_id, so nobody can log in as them.
insert into facemash.profiles (id, username, name, hue, bio, location, followers, following) values
  ('11111111-0000-4000-8000-000000000001', 'naima', 'Naïma Cissé', 22, 'Photographe. Dakar → partout.', 'Dakar', 12400, 311),
  ('11111111-0000-4000-8000-000000000002', 'teolmb', 'Théo Lambert', 205, 'Je casse des builds pour vivre.', 'Lyon', 4820, 640),
  ('11111111-0000-4000-8000-000000000003', 'awad', 'Awa Diop', 150, 'Beatmaker. 90 BPM et plus.', 'Abidjan', 23100, 180),
  ('11111111-0000-4000-8000-000000000004', 'marcosilva', 'Marco Silva', 62, 'Course, vélo, répétition.', 'Lisbonne', 7650, 420),
  ('11111111-0000-4000-8000-000000000005', 'yuki', 'Yuki Tanaka', 320, 'Speedrun et pixel art.', 'Tokyo', 31200, 96),
  ('11111111-0000-4000-8000-000000000006', 'sofiar', 'Sofia Rahmani', 100, 'Opérations produit. Notes trop longues.', 'Casablanca', 2140, 530),
  ('11111111-0000-4000-8000-000000000007', 'liamob', 'Liam O''Brien', 250, 'Blagues moyennes, timing parfait.', 'Dublin', 9870, 274)
on conflict (id) do nothing;

insert into facemash.posts (id, author_id, kind, text, tags, visibility, created_at, likes, reposts, shares, views, completion, watch_seconds, category) values
  ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'video', 'Lever de soleil sur la corniche. Trois prises, une seule bonne.', '{"#photo","#dakar"}', 'public', now() - interval '24 minutes', 3820, 214, 96, 98400, 0.74, 16, 'lifestyle'),
  ('22222222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000003', 'video', 'Nouvelle boucle. Je garde la basse ou pas ?', '{"#musique","#beatmaking"}', 'public', now() - interval '52 minutes', 9140, 512, 380, 240000, 0.81, 22, 'musique'),
  ('22222222-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000002', 'text', 'Rappel : un cache mal invalidé coûte plus cher qu''une base lente. J''ai mis quatre ans à l''accepter.', '{"#technologie"}', 'public', now() - interval '96 minutes', 1240, 88, 41, 22000, 0, 0, 'technologie'),
  ('22222222-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000004', 'photo', '32 km ce matin. Le vent était contre moi dans les deux sens, comme toujours.', '{"#sport"}', 'public', now() - interval '140 minutes', 2210, 46, 22, 34000, 0, 0, 'sport'),
  ('22222222-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000005', 'video', 'Nouveau record perso. La dernière porte se joue à trois images.', '{"#gaming","#speedrun"}', 'public', now() - interval '180 minutes', 15600, 890, 640, 410000, 0.88, 28, 'gaming'),
  ('22222222-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000001', 'carousel', 'Repérage pour la série de septembre. Quatre lieux, un seul retenu.', '{"#photo","#mode"}', 'public', now() - interval '220 minutes', 4310, 120, 67, 61000, 0, 0, 'mode'),
  ('22222222-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000006', 'text', 'On a coupé la moitié des réunions. Personne n''a rien remarqué, sauf le calendrier.', '{"#business"}', 'public', now() - interval '300 minutes', 780, 61, 30, 14000, 0, 0, 'business'),
  ('22222222-0000-4000-8000-000000000008', '11111111-0000-4000-8000-000000000007', 'video', 'Ma mère découvre l''application. Le résultat parle de lui-même.', '{"#humour"}', 'public', now() - interval '360 minutes', 24800, 1400, 2100, 720000, 0.91, 31, 'humour'),
  ('22222222-0000-4000-8000-000000000009', '11111111-0000-4000-8000-000000000002', 'photo', 'Le bureau de septembre. Deux écrans, zéro notification.', '{"#technologie","#lifestyle"}', 'public', now() - interval '420 minutes', 1490, 24, 12, 19000, 0, 0, 'technologie'),
  ('22222222-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000003', 'text', 'Question sérieuse : un morceau doit-il durer plus de deux minutes en 2026 ?', '{"#musique"}', 'public', now() - interval '520 minutes', 3300, 210, 90, 48000, 0, 0, 'musique'),
  ('22222222-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000004', 'video', 'Descente du col, caméra au casque. Montez le son.', '{"#sport"}', 'public', now() - interval '700 minutes', 6800, 300, 240, 155000, 0.69, 13, 'sport'),
  ('22222222-0000-4000-8000-000000000012', '11111111-0000-4000-8000-000000000006', 'carousel', 'Trois graphiques qui expliquent notre trimestre mieux que le rapport de 40 pages.', '{"#business","#éducation"}', 'public', now() - interval '900 minutes', 1120, 140, 88, 26000, 0, 0, 'business'),
  ('22222222-0000-4000-8000-000000000013', '11111111-0000-4000-8000-000000000005', 'photo', 'Pixel art du dimanche. 64 par 64, six couleurs.', '{"#gaming"}', 'public', now() - interval '1200 minutes', 8900, 420, 190, 96000, 0, 0, 'gaming'),
  ('22222222-0000-4000-8000-000000000014', '11111111-0000-4000-8000-000000000007', 'text', 'J''ai testé la fonction Enregistrés. J''y ai retrouvé 200 recettes que je ne ferai jamais.', '{"#humour","#lifestyle"}', 'public', now() - interval '1500 minutes', 5400, 330, 150, 71000, 0, 0, 'humour')
on conflict (id) do nothing;

insert into facemash.post_media (post_id, position, label, ratio) values
  ('22222222-0000-4000-8000-000000000001', 0, 'vidéo 9:16 · corniche à 6h40', '9/16'),
  ('22222222-0000-4000-8000-000000000002', 0, 'vidéo 9:16 · session studio', '9/16'),
  ('22222222-0000-4000-8000-000000000004', 0, 'photo · route côtière', '4/5'),
  ('22222222-0000-4000-8000-000000000005', 0, 'vidéo 9:16 · run final', '9/16'),
  ('22222222-0000-4000-8000-000000000006', 0, 'photo 1 · mur bleu', '4/5'),
  ('22222222-0000-4000-8000-000000000006', 1, 'photo 2 · escalier', '4/5'),
  ('22222222-0000-4000-8000-000000000006', 2, 'photo 3 · rideau', '4/5'),
  ('22222222-0000-4000-8000-000000000006', 3, 'photo 4 · toit', '4/5'),
  ('22222222-0000-4000-8000-000000000008', 0, 'vidéo 9:16 · appel vidéo', '9/16'),
  ('22222222-0000-4000-8000-000000000009', 0, 'photo · bureau', '4/5'),
  ('22222222-0000-4000-8000-000000000011', 0, 'vidéo 9:16 · descente', '9/16'),
  ('22222222-0000-4000-8000-000000000012', 0, 'graphique 1 · rétention', '4/5'),
  ('22222222-0000-4000-8000-000000000012', 1, 'graphique 2 · coûts', '4/5'),
  ('22222222-0000-4000-8000-000000000012', 2, 'graphique 3 · marge', '4/5'),
  ('22222222-0000-4000-8000-000000000013', 0, 'photo · pixel art', '1/1');

insert into facemash.comments (id, post_id, parent_id, author_id, text, likes, created_at) values
  ('33333333-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', null, '11111111-0000-4000-8000-000000000004', 'La lumière est parfaite. Quel objectif ?', 24, now() - interval '20 minutes'),
  ('33333333-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'Le 35mm, ouvert à 1.8.', 7, now() - interval '18 minutes'),
  ('33333333-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', null, '11111111-0000-4000-8000-000000000006', 'On sent le froid du matin rien qu''en regardant.', 9, now() - interval '12 minutes'),
  ('33333333-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000002', null, '11111111-0000-4000-8000-000000000005', 'Garde la basse, mais baisse-la de 2 dB.', 61, now() - interval '40 minutes'),
  ('33333333-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000002', null, '11111111-0000-4000-8000-000000000007', 'Je la mets en sonnerie dès qu''elle sort.', 18, now() - interval '30 minutes'),
  ('33333333-0000-4000-8000-000000000006', '22222222-0000-4000-8000-000000000003', null, '11111111-0000-4000-8000-000000000006', 'Quatre ans, c''est rapide.', 44, now() - interval '80 minutes'),
  ('33333333-0000-4000-8000-000000000007', '22222222-0000-4000-8000-000000000005', null, '11111111-0000-4000-8000-000000000002', 'Trois images. Trois. Bravo.', 120, now() - interval '150 minutes')
on conflict (id) do nothing;

insert into facemash.channels (id, name, slug, description, hue, subscribers) values
  ('44444444-0000-4000-8000-000000000001', 'Facemash Infos', 'infos', 'Annonces produit et état du service.', 182, 12400),
  ('44444444-0000-4000-8000-000000000002', 'Tech Digest', 'techdigest', 'Cinq liens par jour, pas plus.', 205, 8100),
  ('44444444-0000-4000-8000-000000000003', 'Beats Only', 'beats', 'Instrumentaux, deux fois par semaine.', 150, 3260)
on conflict (id) do nothing;

insert into facemash.channel_posts (id, channel_id, text, views, reaction_counts, created_at) values
  ('55555555-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001', 'La lecture hors connexion arrive la semaine prochaine sur les vidéos courtes. Les brouillons de publication sont déjà conservés localement.', 8120, '{"favorite": 210, "thumb_up": 540}', now() - interval '35 minutes'),
  ('55555555-0000-4000-8000-000000000002', '44444444-0000-4000-8000-000000000001', 'Maintenance terminée. Les notes vocales repassent en envoi immédiat.', 11200, '{"thumb_up": 890}', now() - interval '400 minutes'),
  ('55555555-0000-4000-8000-000000000003', '44444444-0000-4000-8000-000000000002', 'Édition du jour : bases vectorielles, coût réel du edge, et un retour d''expérience sur six mois de monorepo.', 4300, '{"thumb_up": 210}', now() - interval '90 minutes'),
  ('55555555-0000-4000-8000-000000000004', '44444444-0000-4000-8000-000000000003', 'Pack de septembre en ligne. Douze boucles, libres pour vos maquettes.', 2900, '{"favorite": 340, "celebration": 120}', now() - interval '600 minutes')
on conflict (id) do nothing;

insert into facemash.channel_post_media (channel_post_id, position, label, ratio) values
  ('55555555-0000-4000-8000-000000000003', 0, 'image · sommaire du jour', '16/9'),
  ('55555555-0000-4000-8000-000000000004', 0, 'vidéo · aperçu du pack', '16/9');

insert into facemash.stories (author_id, label, created_at, expires_at) values
  ('11111111-0000-4000-8000-000000000001', 'photo · atelier 7h', now() - interval '180 minutes', now() + interval '21 hours'),
  ('11111111-0000-4000-8000-000000000001', 'vidéo · sortie en cours', now() - interval '60 minutes', now() + interval '23 hours'),
  ('11111111-0000-4000-8000-000000000003', 'vidéo · maquette du soir', now() - interval '240 minutes', now() + interval '20 hours'),
  ('11111111-0000-4000-8000-000000000005', 'photo · écran de fin', now() - interval '420 minutes', now() + interval '17 hours'),
  ('11111111-0000-4000-8000-000000000004', 'photo · 32 km', now() - interval '600 minutes', now() + interval '14 hours'),
  ('11111111-0000-4000-8000-000000000007', 'vidéo · la même blague', now() - interval '720 minutes', now() + interval '12 hours');
