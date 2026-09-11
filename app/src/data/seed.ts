import { minutesToTimestamp as ago } from '../lib/format';
import type {
  AppNotification,
  Channel,
  Comment,
  Conversation,
  Data,
  Group,
  Post,
  StoryGroup,
  User,
} from '../types';

export const ME = 'me';

const users = (): User[] => [
  { id: ME, name: 'Sacha Mendy', username: 'sacha', hue: 265, bio: 'Design, terrains vagues, café froid.', location: 'Paris', followers: 184, following: 212 },
  { id: 'u1', name: 'Naïma Cissé', username: 'naima', hue: 22, bio: 'Photographe. Dakar → partout.', location: 'Dakar', followers: 12400, following: 311 },
  { id: 'u2', name: 'Théo Lambert', username: 'teolmb', hue: 205, bio: 'Je casse des builds pour vivre.', location: 'Lyon', followers: 4820, following: 640 },
  { id: 'u3', name: 'Awa Diop', username: 'awad', hue: 150, bio: 'Beatmaker. 90 BPM et plus.', location: 'Abidjan', followers: 23100, following: 180 },
  { id: 'u4', name: 'Marco Silva', username: 'marcosilva', hue: 62, bio: 'Course, vélo, répétition.', location: 'Lisbonne', followers: 7650, following: 420 },
  { id: 'u5', name: 'Yuki Tanaka', username: 'yuki', hue: 320, bio: 'Speedrun et pixel art.', location: 'Tokyo', followers: 31200, following: 96 },
  { id: 'u6', name: 'Sofia Rahmani', username: 'sofiar', hue: 100, bio: 'Opérations produit. Notes trop longues.', location: 'Casablanca', followers: 2140, following: 530 },
  { id: 'u7', name: "Liam O'Brien", username: 'liamob', hue: 250, bio: 'Blagues moyennes, timing parfait.', location: 'Dublin', followers: 9870, following: 274 },
];

const posts = (): Post[] => [
  { id: 'p1', authorId: 'u1', kind: 'video', text: 'Lever de soleil sur la corniche. Trois prises, une seule bonne.', tags: ['#photo', '#dakar'], visibility: 'public', createdAt: ago(24), likes: 3820, reposts: 214, shares: 96, views: 98400, completion: 0.74, watchSeconds: 16, category: 'lifestyle', media: [{ label: 'vidéo 9:16 · corniche à 6h40', ratio: '9/16' }] },
  { id: 'p2', authorId: 'u3', kind: 'video', text: 'Nouvelle boucle. Je garde la basse ou pas ?', tags: ['#musique', '#beatmaking'], visibility: 'public', createdAt: ago(52), likes: 9140, reposts: 512, shares: 380, views: 240000, completion: 0.81, watchSeconds: 22, category: 'musique', media: [{ label: 'vidéo 9:16 · session studio', ratio: '9/16' }] },
  { id: 'p3', authorId: 'u2', kind: 'text', text: "Rappel : un cache mal invalidé coûte plus cher qu'une base lente. J'ai mis quatre ans à l'accepter.", tags: ['#technologie'], visibility: 'public', createdAt: ago(96), likes: 1240, reposts: 88, shares: 41, views: 22000, completion: 0, watchSeconds: 0, category: 'technologie', media: [] },
  { id: 'p4', authorId: 'u4', kind: 'photo', text: '32 km ce matin. Le vent était contre moi dans les deux sens, comme toujours.', tags: ['#sport'], visibility: 'public', createdAt: ago(140), likes: 2210, reposts: 46, shares: 22, views: 34000, completion: 0, watchSeconds: 0, category: 'sport', media: [{ label: 'photo · route côtière', ratio: '4/5' }] },
  { id: 'p5', authorId: 'u5', kind: 'video', text: 'Nouveau record perso. La dernière porte se joue à trois images.', tags: ['#gaming', '#speedrun'], visibility: 'public', createdAt: ago(180), likes: 15600, reposts: 890, shares: 640, views: 410000, completion: 0.88, watchSeconds: 28, category: 'gaming', media: [{ label: 'vidéo 9:16 · run final', ratio: '9/16' }] },
  { id: 'p6', authorId: 'u1', kind: 'carousel', text: 'Repérage pour la série de septembre. Quatre lieux, un seul retenu.', tags: ['#photo', '#mode'], visibility: 'public', createdAt: ago(220), likes: 4310, reposts: 120, shares: 67, views: 61000, completion: 0, watchSeconds: 0, category: 'mode', media: [{ label: 'photo 1 · mur bleu', ratio: '4/5' }, { label: 'photo 2 · escalier', ratio: '4/5' }, { label: 'photo 3 · rideau', ratio: '4/5' }, { label: 'photo 4 · toit', ratio: '4/5' }] },
  { id: 'p7', authorId: 'u6', kind: 'text', text: "On a coupé la moitié des réunions. Personne n'a rien remarqué, sauf le calendrier.", tags: ['#business'], visibility: 'public', createdAt: ago(300), likes: 780, reposts: 61, shares: 30, views: 14000, completion: 0, watchSeconds: 0, category: 'business', media: [] },
  { id: 'p8', authorId: 'u7', kind: 'video', text: "Ma mère découvre l'application. Le résultat parle de lui-même.", tags: ['#humour'], visibility: 'public', createdAt: ago(360), likes: 24800, reposts: 1400, shares: 2100, views: 720000, completion: 0.91, watchSeconds: 31, category: 'humour', media: [{ label: 'vidéo 9:16 · appel vidéo', ratio: '9/16' }] },
  { id: 'p9', authorId: 'u2', kind: 'photo', text: 'Le bureau de septembre. Deux écrans, zéro notification.', tags: ['#technologie', '#lifestyle'], visibility: 'public', createdAt: ago(420), likes: 1490, reposts: 24, shares: 12, views: 19000, completion: 0, watchSeconds: 0, category: 'technologie', media: [{ label: 'photo · bureau', ratio: '4/5' }] },
  { id: 'p10', authorId: 'u3', kind: 'text', text: 'Question sérieuse : un morceau doit-il durer plus de deux minutes en 2026 ?', tags: ['#musique'], visibility: 'public', createdAt: ago(520), likes: 3300, reposts: 210, shares: 90, views: 48000, completion: 0, watchSeconds: 0, category: 'musique', media: [] },
  { id: 'p11', authorId: 'u4', kind: 'video', text: 'Descente du col, caméra au casque. Montez le son.', tags: ['#sport'], visibility: 'public', createdAt: ago(700), likes: 6800, reposts: 300, shares: 240, views: 155000, completion: 0.69, watchSeconds: 13, category: 'sport', media: [{ label: 'vidéo 9:16 · descente', ratio: '9/16' }] },
  { id: 'p12', authorId: 'u6', kind: 'carousel', text: 'Trois graphiques qui expliquent notre trimestre mieux que le rapport de 40 pages.', tags: ['#business', '#éducation'], visibility: 'public', createdAt: ago(900), likes: 1120, reposts: 140, shares: 88, views: 26000, completion: 0, watchSeconds: 0, category: 'business', media: [{ label: 'graphique 1 · rétention', ratio: '4/5' }, { label: 'graphique 2 · coûts', ratio: '4/5' }, { label: 'graphique 3 · marge', ratio: '4/5' }] },
  { id: 'p13', authorId: 'u5', kind: 'photo', text: 'Pixel art du dimanche. 64 par 64, six couleurs.', tags: ['#gaming'], visibility: 'public', createdAt: ago(1200), likes: 8900, reposts: 420, shares: 190, views: 96000, completion: 0, watchSeconds: 0, category: 'gaming', media: [{ label: 'photo · pixel art', ratio: '1/1' }] },
  { id: 'p14', authorId: 'u7', kind: 'text', text: "J'ai testé la fonction Enregistrés. J'y ai retrouvé 200 recettes que je ne ferai jamais.", tags: ['#humour', '#lifestyle'], visibility: 'public', createdAt: ago(1500), likes: 5400, reposts: 330, shares: 150, views: 71000, completion: 0, watchSeconds: 0, category: 'humour', media: [] },
  { id: 'p15', authorId: ME, kind: 'photo', text: 'Premier essai de la nouvelle grille. Trois colonnes, beaucoup de vide, aucun regret.', tags: ['#design'], visibility: 'public', createdAt: ago(75), likes: 96, reposts: 4, shares: 3, views: 1900, completion: 0, watchSeconds: 0, category: 'lifestyle', media: [{ label: 'photo · planche de mise en page', ratio: '4/5' }] },
  { id: 'p16', authorId: ME, kind: 'text', text: 'Trois semaines sans notifications le matin. Le travail avance, le téléphone attend.', tags: ['#lifestyle'], visibility: 'followers', createdAt: ago(260), likes: 58, reposts: 2, shares: 1, views: 900, completion: 0, watchSeconds: 0, category: 'lifestyle', media: [] },
];

const comments = (): Record<string, Comment[]> => ({
  p1: [
    { id: 'k1', userId: 'u4', text: 'La lumière est parfaite. Quel objectif ?', createdAt: ago(20), likes: 24, replies: [{ id: 'k1a', userId: 'u1', text: 'Le 35mm, ouvert à 1.8.', createdAt: ago(18), likes: 7 }] },
    { id: 'k2', userId: 'u6', text: 'On sent le froid du matin rien qu’en regardant.', createdAt: ago(12), likes: 9, replies: [] },
  ],
  p2: [
    { id: 'k3', userId: 'u5', text: 'Garde la basse, mais baisse-la de 2 dB.', createdAt: ago(40), likes: 61, replies: [] },
    { id: 'k4', userId: 'u7', text: 'Je la mets en sonnerie dès qu’elle sort.', createdAt: ago(30), likes: 18, replies: [] },
  ],
  p3: [{ id: 'k5', userId: 'u6', text: 'Quatre ans, c’est rapide.', createdAt: ago(80), likes: 44, replies: [] }],
  p5: [{ id: 'k6', userId: 'u2', text: 'Trois images. Trois. Bravo.', createdAt: ago(150), likes: 120, replies: [] }],
});

const conversations = (): Conversation[] => [
  { id: 'c1', userId: 'u1', unread: 2, messages: [
    { id: 'm1', from: 'u1', kind: 'text', text: 'Tu viens shooter demain matin ?', createdAt: ago(62), status: 'read' },
    { id: 'm2', from: ME, kind: 'text', text: 'Oui, 6h30 sur place.', createdAt: ago(58), status: 'read' },
    { id: 'm3', from: 'u1', kind: 'photo', mediaLabel: 'photo · repérage du spot', createdAt: ago(14), status: 'sent' },
    { id: 'm4', from: 'u1', kind: 'text', text: 'Voilà l’angle dont je te parlais.', createdAt: ago(13), status: 'sent' },
  ] },
  { id: 'c2', userId: 'u2', unread: 0, messages: [
    { id: 'm5', from: ME, kind: 'text', text: 'Ton post sur le cache m’a coûté deux heures de refacto.', createdAt: ago(200), status: 'read' },
    { id: 'm6', from: 'u2', kind: 'text', text: 'C’est le but. Deux heures maintenant, deux jours plus tard.', createdAt: ago(190), status: 'read' },
    { id: 'm7', from: 'u2', kind: 'voice', mediaLabel: 'note vocale · 0:24', createdAt: ago(188), status: 'read' },
  ] },
  { id: 'c3', userId: 'u4', unread: 0, messages: [
    { id: 'm8', from: 'u4', kind: 'text', text: 'Sortie vélo dimanche, 7h ?', createdAt: ago(900), status: 'read' },
    { id: 'm9', from: ME, kind: 'text', text: 'Trop tôt. 8h et je suis là.', createdAt: ago(880), status: 'read' },
  ] },
  { id: 'c4', userId: 'u3', unread: 1, messages: [
    { id: 'm10', from: 'u3', kind: 'text', text: 'Je t’envoie la version instrumentale ce soir.', createdAt: ago(30), status: 'sent' },
  ] },
];

const groups = (): Group[] => [
  { id: 'g1', name: 'Dev du soir', description: 'On code, on râle, on recommence.', hue: 205, unread: 4, members: [
    { userId: 'u2', role: 'owner' }, { userId: ME, role: 'admin' }, { userId: 'u6', role: 'member' }, { userId: 'u5', role: 'member' },
  ], messages: [
    { id: 'gm1', from: 'u2', kind: 'text', text: 'Quelqu’un a déjà migré une base de 40 Go sans coupure ?', createdAt: ago(120), status: 'read' },
    { id: 'gm2', from: 'u6', kind: 'text', text: 'Oui. Réplication, bascule, prière.', createdAt: ago(110), status: 'read', reactions: ['thumb_up'] },
    { id: 'gm3', from: 'u5', kind: 'text', text: 'La prière est l’étape critique.', createdAt: ago(96), status: 'read', reactions: ['favorite'] },
    { id: 'gm4', from: 'u2', kind: 'photo', mediaLabel: 'capture · plan de migration', createdAt: ago(40), status: 'sent' },
  ] },
  { id: 'g2', name: 'Rando Bretagne', description: 'Sorties du week-end, météo permettant.', hue: 150, unread: 0, members: [
    { userId: ME, role: 'owner' }, { userId: 'u4', role: 'admin' }, { userId: 'u1', role: 'member' },
  ], messages: [
    { id: 'gm5', from: 'u4', kind: 'text', text: 'Samedi : pointe du Van, 14 km.', createdAt: ago(300), status: 'read' },
    { id: 'gm6', from: 'u1', kind: 'text', text: 'Présente. J’amène l’appareil.', createdAt: ago(290), status: 'read' },
  ] },
];

const channels = (): Channel[] => [
  { id: 'ch1', name: 'Facemash Infos', slug: 'infos', description: 'Annonces produit et état du service.', hue: 182, subscribers: 12400, subscribed: true, posts: [
    { id: 'q1', text: 'La lecture hors connexion arrive la semaine prochaine sur les vidéos courtes. Les brouillons de publication sont déjà conservés localement.', createdAt: ago(35), views: 8120, reactions: { favorite: 210, thumb_up: 540 }, media: [] },
    { id: 'q2', text: 'Maintenance terminée. Les notes vocales repassent en envoi immédiat.', createdAt: ago(400), views: 11200, reactions: { thumb_up: 890 }, media: [] },
  ] },
  { id: 'ch2', name: 'Tech Digest', slug: 'techdigest', description: 'Cinq liens par jour, pas plus.', hue: 205, subscribers: 8100, subscribed: true, posts: [
    { id: 'q3', text: 'Édition du jour : bases vectorielles, coût réel du edge, et un retour d’expérience sur six mois de monorepo.', createdAt: ago(90), views: 4300, reactions: { thumb_up: 210 }, media: [{ label: 'image · sommaire du jour', ratio: '16/9' }] },
  ] },
  { id: 'ch3', name: 'Beats Only', slug: 'beats', description: 'Instrumentaux, deux fois par semaine.', hue: 150, subscribers: 3260, subscribed: false, posts: [
    { id: 'q4', text: 'Pack de septembre en ligne. Douze boucles, libres pour vos maquettes.', createdAt: ago(600), views: 2900, reactions: { favorite: 340, celebration: 120 }, media: [{ label: 'vidéo · aperçu du pack', ratio: '16/9' }] },
  ] },
];

const notifications = (): AppNotification[] => [
  { id: 'n1', kind: 'follow', userId: 'u3', createdAt: ago(8), read: false },
  { id: 'n2', kind: 'like', userId: 'u2', postId: 'p3', createdAt: ago(22), read: false },
  { id: 'n3', kind: 'comment', userId: 'u1', postId: 'p1', createdAt: ago(44), read: false, text: 'Le cadrage est fou.' },
  { id: 'n4', kind: 'reply', userId: 'u4', postId: 'p1', createdAt: ago(90), read: true, text: 'Merci pour la réponse !' },
  { id: 'n5', kind: 'repost', userId: 'u5', postId: 'p5', createdAt: ago(150), read: true },
  { id: 'n6', kind: 'mention', userId: 'u7', postId: 'p14', createdAt: ago(240), read: true, text: '@sacha tu confirmes ?' },
  { id: 'n7', kind: 'message', userId: 'u4', createdAt: ago(400), read: true },
  { id: 'n8', kind: 'invite', userId: 'u6', createdAt: ago(640), read: true, groupName: 'Dev du soir' },
];

const stories = (): StoryGroup[] => [
  { userId: 'u1', items: [{ label: 'photo · atelier 7h', createdAt: ago(180) }, { label: 'vidéo · sortie en cours', createdAt: ago(60) }] },
  { userId: 'u3', items: [{ label: 'vidéo · maquette du soir', createdAt: ago(240) }] },
  { userId: 'u5', items: [{ label: 'photo · écran de fin', createdAt: ago(420) }] },
  { userId: 'u4', items: [{ label: 'photo · 32 km', createdAt: ago(600) }] },
  { userId: 'u7', items: [{ label: 'vidéo · la même blague', createdAt: ago(720) }] },
];

export const seedData = (): Data => ({
  users: users(),
  posts: posts(),
  comments: comments(),
  conversations: conversations(),
  groups: groups(),
  channels: channels(),
  notifications: notifications(),
  stories: stories(),
});

export const seedFollows = (): Record<string, boolean> => ({ u1: true, u2: true, u4: true });

export const INTERESTS = [
  'actualités',
  'humour',
  'sport',
  'musique',
  'technologie',
  'business',
  'gaming',
  'lifestyle',
  'mode',
  'éducation',
];
