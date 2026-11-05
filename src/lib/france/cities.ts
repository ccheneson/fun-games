export interface City {
  name: string
  lat: number
  lon: number
  fact: string
}

/** ~30 largest French cities (metropolitan France), with one fun fact each (in French). */
export const CITIES: City[] = [
  { name: 'Paris', lat: 48.8566, lon: 2.3522, fact: 'La tour Eiffel ne devait rester debout que 20 ans ; on l\'a gardée parce qu\'elle servait d\'antenne radio.' },
  { name: 'Marseille', lat: 43.2965, lon: 5.3698, fact: 'Fondée vers 600 av. J.-C. par des marins grecs venus de Phocée, c\'est considérée comme la plus ancienne ville de France.' },
  { name: 'Lyon', lat: 45.764, lon: 4.8357, fact: 'Les frères Lumière y ont tourné l\'un des tout premiers films en 1895, montrant des ouvriers sortant de leur usine.' },
  { name: 'Toulouse', lat: 43.6047, lon: 1.4442, fact: 'Surnommée « la Ville rose » pour ses briques en terre cuite, c\'est aussi là qu\'Airbus assemble ses avions.' },
  { name: 'Nice', lat: 43.7102, lon: 7.262, fact: 'Nice n\'est française que depuis 1860, quand le comté de Nice a été cédé à la France par le traité de Turin.' },
  { name: 'Nantes', lat: 47.2184, lon: -1.5536, fact: 'Jules Verne y est né en 1828, et un éléphant mécanique géant se promène aujourd\'hui sur l\'île de Nantes.' },
  { name: 'Montpellier', lat: 43.6108, lon: 3.8767, fact: 'Sa faculté de médecine, fondée en 1220, est l\'une des plus anciennes du monde encore en activité.' },
  { name: 'Strasbourg', lat: 48.5734, lon: 7.7521, fact: 'Sa cathédrale a été le plus haut bâtiment du monde de 1647 à 1874.' },
  { name: 'Bordeaux', lat: 44.8378, lon: -0.5792, fact: 'Surnommée le « Port de la Lune » à cause de la forme en croissant de la boucle de la Garonne.' },
  { name: 'Lille', lat: 50.6292, lon: 3.0573, fact: 'Charles de Gaulle, chef de la France libre pendant la Seconde Guerre mondiale puis président, y est né en 1890.' },
  { name: 'Rennes', lat: 48.1173, lon: -1.6778, fact: 'Le Parlement de Bretagne a été gravement endommagé par un incendie en 1994, lors d\'une manifestation de pêcheurs, puis restauré.' },
  { name: 'Reims', lat: 49.2583, lon: 4.0317, fact: 'La plupart des rois de France ont été sacrés dans sa cathédrale, et la ville est au cœur du pays du champagne.' },
  { name: 'Le Havre', lat: 49.4944, lon: 0.1079, fact: 'Reconstruit après la Seconde Guerre mondiale par l\'architecte Auguste Perret, son centre en béton est inscrit au patrimoine mondial de l\'UNESCO.' },
  { name: 'Saint-Étienne', lat: 45.4397, lon: 4.3872, fact: 'La première ligne de chemin de fer de France y a ouvert en 1827 pour transporter du charbon.' },
  { name: 'Toulon', lat: 43.1242, lon: 5.928, fact: 'Elle abrite la principale base de la Marine nationale, et c\'est là qu\'un jeune officier d\'artillerie nommé Napoléon s\'est fait remarquer en 1793.' },
  { name: 'Grenoble', lat: 45.1885, lon: 5.7245, fact: 'Elle a accueilli les Jeux olympiques d\'hiver de 1968 et on l\'appelle la « capitale des Alpes ».' },
  { name: 'Dijon', lat: 47.322, lon: 5.0415, fact: 'Elle a donné son nom à la moutarde de Dijon et se trouve au cœur du vignoble bourguignon.' },
  { name: 'Angers', lat: 47.4784, lon: -0.5632, fact: 'Son château abrite la tenture de l\'Apocalypse, le plus grand ensemble de tapisseries médiévales conservé.' },
  { name: 'Nîmes', lat: 43.8367, lon: 4.3601, fact: 'Le mot « denim » viendrait de « serge de Nîmes », le tissu fabriqué d\'abord ici.' },
  { name: 'Le Mans', lat: 48.0061, lon: 0.1996, fact: 'Elle accueille les 24 Heures du Mans, la célèbre course d\'endurance automobile organisée chaque année depuis 1923.' },
  { name: 'Clermont-Ferrand', lat: 45.7772, lon: 3.087, fact: 'Le fabricant de pneus Michelin y a été fondé en 1889 et y a toujours son siège.' },
  { name: 'Brest', lat: 48.3904, lon: -4.4861, fact: 'Elle accueille l\'un des plus grands rassemblements maritimes d\'Europe, organisé à peu près tous les quatre ans.' },
  { name: 'Tours', lat: 47.3941, lon: 0.6848, fact: 'Porte d\'entrée des châteaux de la Loire, dans une région surnommée le « Jardin de la France ».' },
  { name: 'Limoges', lat: 45.8336, lon: 1.2611, fact: 'Mondialement connue pour sa porcelaine, produite ici depuis la découverte de kaolin à proximité en 1768.' },
  { name: 'Amiens', lat: 49.8941, lon: 2.2958, fact: 'Sa cathédrale est la plus grande cathédrale gothique de France par son volume.' },
  { name: 'Perpignan', lat: 42.6887, lon: 2.8948, fact: 'Le peintre Salvador Dalí a appelé sa gare « le centre de l\'univers ».' },
  { name: 'Metz', lat: 49.1193, lon: 6.1757, fact: 'Sa cathédrale possède l\'une des plus grandes surfaces de vitraux au monde, ce qui lui vaut le surnom de « Lanterne du Bon Dieu ».' },
  { name: 'Besançon', lat: 47.2378, lon: 6.0241, fact: 'Victor Hugo, l\'auteur des Misérables, y est né en 1802.' },
  { name: 'Orléans', lat: 47.9029, lon: 1.9093, fact: 'Jeanne d\'Arc a délivré la ville du siège anglais en 1429, et chaque mois de mai la ville la célèbre encore.' },
  { name: 'Rouen', lat: 49.4432, lon: 1.0993, fact: 'Claude Monet a peint sa cathédrale plus de 30 fois, sous différentes lumières et météos.' },
]
