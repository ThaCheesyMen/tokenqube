import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  image: string;
  platform: string[];
}

interface GameSelectorProps {
  value: string;
  onChange: (gameName: string) => void;
  placeholder?: string;
}

export default function GameSelector({ value, onChange, placeholder = 'Search for a game...' }: GameSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Popular games list with images
  const games: Game[] = [
    { id: '1', name: 'Fortnite', image: 'https://cdn2.unrealengine.com/14br-consoles-3840x2160-wlogo-3840x2160-485522446.jpg', platform: ['PC', 'Console', 'Mobile'] },
    { id: '2', name: 'CS:GO', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg', platform: ['PC'] },
    { id: '3', name: 'Battlefield 6', image: 'https://media.contentapi.ea.com/content/dam/battlefield/battlefield-2042/common/featured-image-16x9.jpg', platform: ['PC', 'Console'] },
    { id: '4', name: 'Valorant', image: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt5c61e2e8f963e1fc/5eb26f769b5e9d6e33d31e4c/V_AGENTS_587x900_Jett.png', platform: ['PC'] },
    { id: '5', name: 'League of Legends', image: 'https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/blt7b18f9f73b6a005c/6229c8e639521f01a7154687/LOL_PROMOART_2.jpg', platform: ['PC'] },
    { id: '6', name: 'Apex Legends', image: 'https://media.contentapi.ea.com/content/dam/apex-legends/common/articles/legacy-article/apex-featured-image-16x9.jpg', platform: ['PC', 'Console'] },
    { id: '7', name: 'Call of Duty: Warzone', image: 'https://www.callofduty.com/content/dam/atvi/callofduty/cod-touchui/kronos/common/social-share/social-share-image.jpg', platform: ['PC', 'Console'] },
    { id: '8', name: 'Dota 2', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg', platform: ['PC'] },
    { id: '9', name: 'Overwatch 2', image: 'https://images.blz-contentstack.com/v3/assets/blt2477dcaf4ebd440c/blt6b2de8bc64f37c57/63594a5f3f1e1f5ff5a9fce2/ow2-logo.png', platform: ['PC', 'Console'] },
    { id: '10', name: 'Rocket League', image: 'https://rocketleague.media.zestyio.com/rl_carousel_rocketpass.309bf22bd29c2e411e9dd8eb07575bb1.jpg', platform: ['PC', 'Console'] },
    { id: '11', name: 'Rainbow Six Siege', image: 'https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/2zhLWu4gQ6Oz5ztQg4jqeA/a431cdc1f1da879d64d12f10c65ff25d/r6s-artwork.jpg', platform: ['PC', 'Console'] },
    { id: '12', name: 'Minecraft', image: 'https://www.minecraft.net/content/dam/games/minecraft/key-art/Games_Subnav_Minecraft-300x465.jpg', platform: ['PC', 'Console', 'Mobile'] },
    { id: '13', name: 'Among Us', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/945360/header.jpg', platform: ['PC', 'Mobile'] },
    { id: '14', name: 'Fall Guys', image: 'https://cdn1.epicgames.com/offer/50118b7f954e450f8823df1614b24e80/EGS_FallGuysUltimateKnockout_Mediatonic_S1_2560x1440-ee500cf8aa1c36de5c4c3ee8c8ef9ff1', platform: ['PC', 'Console'] },
    { id: '15', name: 'PUBG', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg', platform: ['PC', 'Console', 'Mobile'] },
  ];

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = games.filter(game =>
        game.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGames(filtered);
    } else {
      setFilteredGames(games);
    }
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (game: Game) => {
    setSearchTerm(game.name);
    onChange(game.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && filteredGames.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-[#202225] rounded-lg shadow-2xl max-h-96 overflow-y-auto">
          {filteredGames.map((game) => (
            <button
              key={game.id}
              onClick={() => handleSelect(game)}
              className="w-full p-3 hover:bg-[#0f0f0f] transition-colors flex items-center gap-3 group"
            >
              {/* Game Image */}
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#0f0f0f]">
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x64/8B5CF6/FFFFFF?text=' + game.name.charAt(0);
                  }}
                />
              </div>

              {/* Game Info */}
              <div className="flex-1 text-left">
                <h4 className="text-white font-semibold group-hover:text-[#8B5CF6] transition-colors">
                  {game.name}
                </h4>
                <div className="flex gap-1 mt-1">
                  {game.platform.map((platform, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-md"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && searchTerm && filteredGames.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-[#202225] rounded-lg shadow-2xl p-4 text-center">
          <p className="text-gray-400">No games found</p>
          <p className="text-sm text-gray-500 mt-1">Try searching for a different name</p>
        </div>
      )}
    </div>
  );
}

