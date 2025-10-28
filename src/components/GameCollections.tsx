import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star, BookMarked, CheckCircle, Trophy, Users, Heart, Plus, X, Trash2 } from 'lucide-react';
import { toast } from './Toast';

interface Collection {
  id: string;
  collection_name: string;
  collection_type: string;
  collection_icon: string;
  collection_color: string;
  is_public: boolean;
  item_count?: number;
}

interface CollectionItem {
  id: string;
  game_id: string;
  game_name: string;
  platform: string;
  notes: string | null;
  rating: number | null;
  added_at: string;
}

interface GameCollectionsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function GameCollections({ userId, isOwnProfile = false }: GameCollectionsProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, [userId]);

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionItems(selectedCollection.id);
    }
  }, [selectedCollection]);

  const fetchCollections = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('game_collections')
      .select(`
        *,
        game_collection_items (count)
      `)
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (data && !error) {
      const formatted = data.map(c => ({
        ...c,
        item_count: c.game_collection_items[0]?.count || 0
      }));
      setCollections(formatted);
      if (formatted.length > 0 && !selectedCollection) {
        setSelectedCollection(formatted[0]);
      }
    }

    setLoading(false);
  };

  const fetchCollectionItems = async (collectionId: string) => {
    const { data } = await supabase
      .from('game_collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false });

    if (data) {
      setCollectionItems(data);
    }
  };

  const getCollectionIcon = (type: string, customIcon?: string) => {
    if (customIcon) return customIcon;
    
    const icons: { [key: string]: JSX.Element } = {
      favorites: <Star className="w-5 h-5" />,
      backlog: <BookMarked className="w-5 h-5" />,
      completed: <CheckCircle className="w-5 h-5" />,
      perfect: <Trophy className="w-5 h-5" />,
      multiplayer: <Users className="w-5 h-5" />,
      wishlist: <Heart className="w-5 h-5" />
    };
    
    return icons[type] || <Star className="w-5 h-5" />;
  };

  const removeFromCollection = async (itemId: string) => {
    if (!isOwnProfile) return;

    const { error } = await supabase
      .from('game_collection_items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      toast.success('Game removed from collection');
      fetchCollections();
      if (selectedCollection) {
        fetchCollectionItems(selectedCollection.id);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-xl p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white">Game Collections</h3>
          <p className="text-gray-400 text-sm mt-1">Organize your games into custom lists</p>
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>
        )}
      </div>

      {/* Collection Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#8B5CF6] scrollbar-track-[#202225]">
        {collections.map((collection) => (
          <button
            key={collection.id}
            onClick={() => setSelectedCollection(collection)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              selectedCollection?.id === collection.id
                ? `bg-gradient-to-r ${collection.collection_color} text-white shadow-lg`
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#4f5660]'
            }`}
          >
            <span className="text-lg">{collection.collection_icon}</span>
            <span>{collection.collection_name}</span>
            <span className="text-xs opacity-75">({collection.item_count || 0})</span>
          </button>
        ))}
      </div>

      {/* Collection Content */}
      {selectedCollection && (
        <div>
          {collectionItems.length === 0 ? (
            <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-[#202225]">
              <div className="text-5xl mb-4">{selectedCollection.collection_icon}</div>
              <h4 className="text-xl font-bold text-white mb-2">No games yet</h4>
              <p className="text-gray-400">
                {isOwnProfile 
                  ? `Add games to your ${selectedCollection.collection_name} collection` 
                  : `This collection is empty`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectionItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1a1a1a] rounded-xl p-4 border border-[#202225] hover:border-[#8B5CF6]/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate">{item.game_name}</h4>
                      <p className="text-xs text-gray-400 capitalize">{item.platform}</p>
                    </div>
                    {isOwnProfile && (
                      <button
                        onClick={() => removeFromCollection(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>

                  {item.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < item.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.notes}</p>
                  )}

                  <p className="text-xs text-gray-500">
                    Added {new Date(item.added_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Game Modal (placeholder - would need full implementation) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Create Collection</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[#0f0f0f] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-400 text-center py-8">
              Collection creation feature coming soon!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

