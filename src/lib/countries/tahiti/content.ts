import { makeStrings } from '../strings'
import type { CountryContent } from '../types'

/** Written part of Tahiti and Moorea (French Polynesia): cities, sites, no rivers in the map data (in "fr"). */
export const content: CountryContent = {
  id: 'tahiti',
  name: 'Tahiti et Moorea',
  lang: 'fr',
  cities: [
    { name: 'Papeete', lat: -17.5397, lon: -149.5689, fact: "Capitale de la Polynésie française, la commune compte environ 26 700 habitants (2022), au cœur d'une agglomération bien plus vaste." },
    { name: "Faa'a", lat: -17.5539, lon: -149.6114, fact: "Commune voisine de Papeete, parmi les plus peuplées de la Polynésie française." },
    { name: 'Punaauia', lat: -17.6006, lon: -149.6094, fact: "Commune résidentielle de la côte ouest, dans le prolongement de l'agglomération de Papeete." },
    { name: 'Pirae', lat: -17.5244, lon: -149.5231, fact: "Elle fait partie de l'agglomération de Papeete, sur la côte nord-est." },
    { name: 'Mahina', lat: -17.5053, lon: -149.4903, fact: "Son littoral s'ouvre sur la baie de Matavai, où des navigateurs européens ont jeté l'ancre au XVIIIe siècle." },
    { name: 'Paea', lat: -17.6869, lon: -149.5869, fact: "Commune de la côte ouest, au sud de Punaauia." },
    { name: 'Papara', lat: -17.7717, lon: -149.4828, fact: "Commune de la côte sud-ouest, bordée de vagues prisées des surfeurs." },
    { name: 'Teva I Uta', lat: -17.7658, lon: -149.4058, fact: "Commune de la côte sud, au pied de l'isthme de Taravao." },
    { name: 'Taravao', lat: -17.7361, lon: -149.3083, fact: "Il se dresse sur l'étroit isthme qui relie Tahiti Nui à la presqu'île de Tahiti Iti." },
    { name: 'Papenoo', lat: -17.5128, lon: -149.4233, fact: "Le village est bâti à l'embouchure de la rivière Papenoo, l'un des principaux cours d'eau de l'île." },
    { name: 'Tiarei', lat: -17.5444, lon: -149.3422, fact: "Elle se situe sur la côte est, côté le plus arrosé de l'île, aux nombreuses cascades." },
    { name: "Teahupo'o", lat: -17.8472, lon: -149.2672, fact: "Petit village au bout de la route côtière sud de Tahiti Iti." },
    { name: 'Afareaitu', lat: -17.5494, lon: -149.7906, fact: "C'est le chef-lieu de l'île de Moorea." },
    { name: 'Papetoai', lat: -17.4956, lon: -149.8728, fact: "Ce village de la côte nord de Moorea est connu pour son église octogonale, souvent présentée comme la plus ancienne de Polynésie encore en usage." },
  ],
  sites: [
    { name: 'Le marché de Papeete', city: 'Papeete', lat: -17.5388, lon: -149.567, fact: "Ce grand marché couvert du centre-ville vend fleurs, fruits, poissons et artisanat." },
    { name: "L'aéroport de Tahiti-Faa'a", city: "Faa'a", lat: -17.5539, lon: -149.6114, fact: "Ouvert en 1960, c'est le seul aéroport international de la Polynésie française." },
    { name: 'La pointe Vénus', city: 'Mahina', lat: -17.4945, lon: -149.496, fact: "James Cook y a installé en 1769 un camp fortifié et un observatoire pour suivre le passage de Vénus devant le Soleil." },
    { name: 'Le musée Paul Gauguin', city: 'Papeari', lat: -17.7307, lon: -149.332, fact: "Le peintre Paul Gauguin a vécu à Tahiti dans les années 1890 ; un musée lui est consacré à Papeari." },
    { name: "La vallée de la Fautaua", city: 'Fautaua', lat: -17.52, lon: -149.55, fact: "Cette vallée verdoyante domine Papeete et abrite une cascade très visitée." },
    { name: "La vague de Teahupo'o", city: "Teahupo'o", lat: -17.8615, lon: -149.2574, fact: "Considérée comme l'une des vagues les plus dangereuses au monde, elle a accueilli le surf des Jeux olympiques de 2024." },
    { name: "Le mont Tohiveʻa", city: 'Moorea', lat: -17.5449, lon: -149.8127, fact: "Point culminant de Moorea, il s'élève à 1 207 m, près du centre de l'île." },
    { name: 'La baie de Cook', city: 'Paopao', lat: -17.5081, lon: -149.819, fact: "Profonde baie bleue de Moorea où mouillent des voiliers, elle est dominée par le mont Mouaputa (830 m)." },
  ],
  rivers: {},
  strings: makeStrings('fr', 'Tahiti et Moorea'),
}
