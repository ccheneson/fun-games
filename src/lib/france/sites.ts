export interface Site {
  name: string
  /** The commune it stands in: at most one site per commune, to keep the map readable. */
  city: string
  lat: number
  lon: number
  fact: string
}

/** 50 famous sites, one per commune, with one fun fact each (in French). */
export const SITES: Site[] = [
  { name: 'La tour Eiffel', city: 'Paris', lat: 48.8584, lon: 2.2945, fact: 'Gustave Eiffel s\'était aménagé un petit appartement tout en haut de la tour, où il a reçu Thomas Edison en 1889.' },
  { name: 'Le château de Versailles', city: 'Versailles', lat: 48.8049, lon: 2.1204, fact: 'La galerie des Glaces mesure 73 mètres de long et compte 357 miroirs ; le traité de Versailles y a été signé en 1919.' },
  { name: 'Le Mont-Saint-Michel', city: 'Le Mont-Saint-Michel', lat: 48.6361, lon: -1.5115, fact: 'À marée haute, le rocher devient une île : la baie connaît certaines des plus fortes marées d\'Europe.' },
  { name: 'Le château de Chambord', city: 'Chambord', lat: 47.6162, lon: 1.517, fact: 'Avec ses 426 pièces et son célèbre escalier à double révolution, c\'est le plus vaste château de la Loire.' },
  { name: 'La cité de Carcassonne', city: 'Carcassonne', lat: 43.2063, lon: 2.3637, fact: 'Sa cité fortifiée compte 52 tours et près de 3 km de remparts, restaurés au XIXᵉ siècle par Viollet-le-Duc.' },
  { name: 'Le palais des Papes', city: 'Avignon', lat: 43.9508, lon: 4.8075, fact: 'Au XIVᵉ siècle, les papes y ont résidé pendant près de 70 ans ; c\'est le plus grand palais gothique du monde.' },
  { name: 'Les arènes d\'Arles', city: 'Arles', lat: 43.6778, lon: 4.631, fact: 'Cet amphithéâtre romain du Iᵉʳ siècle pouvait accueillir environ 20 000 spectateurs, et il accueille encore des corridas.' },
  { name: 'Le pont du Gard', city: 'Vers-Pont-du-Gard', lat: 43.9475, lon: 4.5352, fact: 'Ce pont-aqueduc romain à trois étages mesure environ 49 m de haut et faisait partie d\'un aqueduc de 50 km qui alimentait Nîmes.' },
  { name: 'La cathédrale de Reims', city: 'Reims', lat: 49.2535, lon: 4.034, fact: 'Gravement endommagée par les bombardements de 1914, sa façade abrite l\'ange au sourire, un symbole de la ville.' },
  { name: 'La cathédrale de Chartres', city: 'Chartres', lat: 48.4478, lon: 1.4875, fact: 'Ses vitraux du XIIIᵉ siècle, d\'un bleu célèbre, sont presque tous d\'origine.' },
  { name: 'Le Clos Lucé', city: 'Amboise', lat: 47.4086, lon: 0.991, fact: 'Léonard de Vinci y a passé les trois dernières années de sa vie et y est mort en 1519.' },
  { name: 'Le château de Chenonceau', city: 'Chenonceaux', lat: 47.3249, lon: 1.0703, fact: 'Surnommé le « château des Dames », il est bâti en travers du Cher.' },
  { name: 'Les sanctuaires de Lourdes', city: 'Lourdes', lat: 43.0976, lon: -0.0586, fact: 'Depuis les apparitions de la Vierge à Bernadette Soubirous en 1858, des millions de pèlerins s\'y rendent chaque année.' },
  { name: 'La pointe du Raz', city: 'Plogoff', lat: 48.0391, lon: -4.7355, fact: 'C\'est l\'une des pointes les plus occidentales de la Bretagne, battue par les tempêtes de la mer d\'Iroise.' },
  { name: 'Les falaises d\'Étretat', city: 'Étretat', lat: 49.707, lon: 0.2058, fact: 'Ses falaises blanches et l\'Aiguille creuse ont inspiré Claude Monet et Maurice Leblanc, le père d\'Arsène Lupin.' },
  { name: 'Les remparts de Saint-Malo', city: 'Saint-Malo', lat: 48.6493, lon: -2.0257, fact: 'Ancienne cité de corsaires, sa vieille ville fortifiée a été reconstruite à l\'identique après 1944.' },
  { name: 'Les alignements de Carnac', city: 'Carnac', lat: 47.5895, lon: -3.078, fact: 'Plus de 3 000 menhirs y ont été dressés il y a plus de 5 000 ans.' },
  { name: 'Rocamadour', city: 'Rocamadour', lat: 44.7995, lon: 1.6177, fact: 'Cette cité religieuse accrochée à une falaise est une étape historique des pèlerins vers Saint-Jacques-de-Compostelle.' },
  { name: 'La grotte de Lascaux', city: 'Montignac', lat: 45.0536, lon: 1.1676, fact: 'Découverte en 1940 par quatre adolescents, la grotte abrite des peintures vieilles d\'environ 17 000 ans.' },
  { name: 'Le palais de l\'Île', city: 'Annecy', lat: 45.8993, lon: 6.1294, fact: 'Cet ancien palais-prison, en forme de proue de bateau, se dresse au milieu du canal du Thiou.' },
  { name: 'Le mont Blanc', city: 'Chamonix', lat: 45.8326, lon: 6.8652, fact: 'Avec 4 805 m, c\'est le plus haut sommet des Alpes et d\'Europe occidentale.' },
  { name: 'La basilique de Fourvière', city: 'Lyon', lat: 45.7622, lon: 4.8225, fact: 'Cette basilique blanche du XIXᵉ siècle domine Lyon depuis la colline surnommée « la colline qui prie ».' },
  { name: 'Notre-Dame de la Garde', city: 'Marseille', lat: 43.284, lon: 5.3714, fact: 'Surnommée la « Bonne Mère », elle veille sur Marseille depuis une colline de 149 m ; sa Vierge dorée mesure plus de 11 m.' },
  { name: 'La promenade des Anglais', city: 'Nice', lat: 43.695, lon: 7.265, fact: 'Aménagée au XIXᵉ siècle à l\'initiative de la colonie anglaise, elle longe la baie des Anges sur environ 7 km.' },
  { name: 'Le palais des Festivals', city: 'Cannes', lat: 43.5513, lon: 7.0173, fact: 'Chaque année, le Festival de Cannes y décerne la Palme d\'or, en haut de ses célèbres marches rouges.' },
  { name: 'Les remparts d\'Aigues-Mortes', city: 'Aigues-Mortes', lat: 43.5666, lon: 4.1913, fact: 'Saint Louis s\'y est embarqué pour les croisades en 1248 et 1270 ; ses remparts mesurent environ 1,6 km.' },
  { name: 'La cathédrale Sainte-Cécile', city: 'Albi', lat: 43.9297, lon: 2.143, fact: 'C\'est la plus grande cathédrale en briques du monde.' },
  { name: 'La basilique Saint-Sernin', city: 'Toulouse', lat: 43.6082, lon: 1.4415, fact: 'C\'est la plus grande église romane conservée d\'Europe, et une étape du chemin de Saint-Jacques.' },
  { name: 'Le miroir d\'eau', city: 'Bordeaux', lat: 44.8414, lon: -0.5698, fact: 'Inauguré en 2006 sur les quais de la Garonne, il est souvent présenté comme le plus grand miroir d\'eau du monde.' },
  { name: 'Le château des ducs de Bretagne', city: 'Nantes', lat: 47.2163, lon: -1.5496, fact: 'Anne de Bretagne, qui fut deux fois reine de France, y est née en 1477.' },
  { name: 'Le puy de Dôme', city: 'Orcines', lat: 45.7725, lon: 2.9643, fact: 'Ce volcan éteint de 1 465 m domine la chaîne des Puys, classée à l\'UNESCO ; un temple gallo-romain de Mercure se dressait à son sommet.' },
  { name: 'Le beffroi de Lille', city: 'Lille', lat: 50.6329, lon: 3.0629, fact: 'Haut d\'environ 104 m, ce beffroi de l\'hôtel de ville, construit dans les années 1930, domine la ville.' },
  { name: 'Les Hospices de Beaune', city: 'Beaune', lat: 47.0262, lon: 4.8386, fact: 'Fondé en 1443, cet ancien hôpital est célèbre pour son toit de tuiles vernissées multicolores et sa vente de vins aux enchères chaque novembre.' },
  { name: 'La dune du Pilat', city: 'La Teste-de-Buch', lat: 44.5895, lon: -1.2128, fact: 'Avec plus de 100 m de haut, c\'est la plus haute dune d\'Europe.' },
  { name: 'Le viaduc de Millau', city: 'Millau', lat: 44.0775, lon: 3.0225, fact: 'Avec un pylône de 343 m, c\'est l\'un des ponts les plus hauts du monde, plus haut que la tour Eiffel.' },
  { name: 'Le château de Fontainebleau', city: 'Fontainebleau', lat: 48.4025, lon: 2.6998, fact: 'Napoléon Iᵉʳ y a fait ses adieux à sa Garde en 1814, dans la cour du Cheval-Blanc, avant de partir pour l\'île d\'Elbe.' },
  { name: 'La maison de Monet', city: 'Giverny', lat: 49.0759, lon: 1.5337, fact: 'Claude Monet y a peint ses célèbres nymphéas dans le jardin d\'eau qu\'il avait fait aménager.' },
  { name: 'La basilique de Saint-Denis', city: 'Saint-Denis', lat: 48.9355, lon: 2.3598, fact: 'Nécropole des rois de France, son chœur est considéré comme l\'un des premiers édifices gothiques.' },
  { name: 'Le château de Blois', city: 'Blois', lat: 47.5855, lon: 1.3357, fact: 'Résidence de plusieurs rois de France, il est célèbre pour son escalier à vis, chef-d\'œuvre de la Renaissance.' },
  { name: 'La forteresse de Chinon', city: 'Chinon', lat: 47.1666, lon: 0.2386, fact: 'Jeanne d\'Arc y a rencontré le futur Charles VII en 1429.' },
  { name: 'Les jardins de Villandry', city: 'Villandry', lat: 47.3402, lon: 0.5139, fact: 'Ses jardins Renaissance comprennent un potager décoratif de neuf carrés aux légumes de couleurs.' },
  { name: 'Les tours de La Rochelle', city: 'La Rochelle', lat: 46.1558, lon: -1.1531, fact: 'Le vieux port était gardé par deux tours médiévales, Saint-Nicolas et la Chaîne, qui fermait l\'entrée avec une chaîne.' },
  { name: 'Le Centre Pompidou-Metz', city: 'Metz', lat: 49.1076, lon: 6.1805, fact: 'Ouvert en 2010, il est coiffé d\'une immense toiture en bois qui évoque un chapeau chinois.' },
  { name: 'La place Stanislas', city: 'Nancy', lat: 48.6937, lon: 6.1834, fact: 'Inscrite à l\'UNESCO, cette place royale est ornée de grilles en fer forgé doré.' },
  { name: 'La Petite Venise', city: 'Colmar', lat: 48.0734, lon: 7.355, fact: 'Ce quartier de maisons à colombages au bord de la Lauch rappelle Venise.' },
  { name: 'Le Parlement européen', city: 'Strasbourg', lat: 48.5972, lon: 7.7683, fact: 'Strasbourg en est le siège officiel, même si de nombreuses réunions se tiennent à Bruxelles.' },
  { name: 'L\'ossuaire de Douaumont', city: 'Verdun', lat: 49.2147, lon: 5.4219, fact: 'Il abrite les restes d\'environ 130 000 soldats français et allemands tombés à Verdun en 1916.' },
  { name: 'La tapisserie de Bayeux', city: 'Bayeux', lat: 49.2741, lon: -0.7014, fact: 'Longue d\'environ 70 m, elle raconte en broderie la conquête de l\'Angleterre par Guillaume le Conquérant en 1066.' },
  { name: 'Omaha Beach', city: 'Colleville-sur-Mer', lat: 49.3697, lon: -0.8744, fact: 'C\'est l\'une des cinq plages du Débarquement du 6 juin 1944, surplombée par le cimetière américain.' },
  { name: 'Le rocher Saint-Michel d\'Aiguilhe', city: 'Le Puy-en-Velay', lat: 45.0485, lon: 3.8913, fact: 'Une chapelle du Xᵉ siècle est perchée au sommet de ce piton volcanique haut d\'environ 80 m.' },
]
