import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Hammer, Clock, CheckCircle, Lock, Sparkles, Package } from 'lucide-react';
import { toast } from './Toast';

interface CraftingRecipe {
  id: string;
  recipe_name: string;
  description: string;
  required_items: Record<string, number>;
  required_tokens: number;
  crafting_time_minutes: number;
  result_item_id: string;
  is_active: boolean;
  result_item?: {
    item_name: string;
    description: string;
    rarity: string;
  };
}

interface CraftingQueueItem {
  id: string;
  recipe_id: string;
  started_at: string;
  completes_at: string;
  is_completed: boolean;
  crafting_recipes?: CraftingRecipe;
}

export default function CraftingStation() {
  const { profile } = useAuth();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [craftingQueue, setCraftingQueue] = useState<CraftingQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);

  useEffect(() => {
    if (profile) {
      fetchRecipes();
      fetchCraftingQueue();
      
      const interval = setInterval(fetchCraftingQueue, 10000); // Update every 10s
      return () => clearInterval(interval);
    }
  }, [profile]);

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('crafting_recipes')
        .select(`
          *,
          result_item:marketplace_items!result_item_id (
            item_name,
            description,
            rarity
          )
        `)
        .eq('is_active', true);

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCraftingQueue = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('user_crafting_queue')
        .select(`
          *,
          crafting_recipes (
            recipe_name,
            crafting_time_minutes,
            result_item:marketplace_items!result_item_id (
              item_name,
              rarity
            )
          )
        `)
        .eq('user_id', profile.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setCraftingQueue(data || []);
    } catch (error) {
      console.error('Error fetching crafting queue:', error);
    }
  };

  const startCrafting = async (recipe: CraftingRecipe) => {
    if (!profile) return;

    if (recipe.required_tokens > (profile.token_balance || 0)) {
      toast.error('Insufficient tokens!');
      return;
    }

    try {
      const now = new Date();
      const completesAt = new Date(now.getTime() + recipe.crafting_time_minutes * 60000);

      // Deduct tokens
      await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - recipe.required_tokens })
        .eq('id', profile.id);

      // Add to queue
      const { error } = await supabase
        .from('user_crafting_queue')
        .insert({
          user_id: profile.id,
          recipe_id: recipe.id,
          started_at: now.toISOString(),
          completes_at: completesAt.toISOString(),
          is_completed: false
        });

      if (error) throw error;

      toast.success(`Started crafting ${recipe.recipe_name}!`);
      setSelectedRecipe(null);
      fetchCraftingQueue();
    } catch (error) {
      console.error('Error starting craft:', error);
      toast.error('Failed to start crafting');
    }
  };

  const claimCraftedItem = async (queueItem: CraftingQueueItem) => {
    if (!profile) return;

    try {
      // Mark as completed
      await supabase
        .from('user_crafting_queue')
        .update({ is_completed: true })
        .eq('id', queueItem.id);

      // Add item to inventory (simplified - you'd need an inventory table)
      toast.success(`Crafted ${queueItem.crafting_recipes?.recipe_name}! 🎉`);
      fetchCraftingQueue();
    } catch (error) {
      console.error('Error claiming item:', error);
      toast.error('Failed to claim item');
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'from-gray-500 to-gray-600';
      case 'uncommon': return 'from-green-500 to-emerald-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      case 'epic': return 'from-purple-500 to-pink-500';
      case 'legendary': return 'from-yellow-500 to-orange-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTimeRemaining = (completesAt: string) => {
    const diff = new Date(completesAt).getTime() - Date.now();
    if (diff <= 0) return 'Ready!';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Hammer className="w-6 h-6 text-orange-500" />
            Crafting Station
          </h2>
          <p className="text-sm text-gray-400 mt-1">Craft powerful items and collectibles</p>
        </div>
      </div>

      {/* Crafting Queue */}
      {craftingQueue.filter(q => !q.is_completed).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Currently Crafting</h3>
          <div className="space-y-3">
            {craftingQueue.filter(q => !q.is_completed).map((item) => {
              const isReady = new Date(item.completes_at) <= new Date();
              const progress = isReady ? 100 : 
                ((Date.now() - new Date(item.started_at).getTime()) / 
                 (new Date(item.completes_at).getTime() - new Date(item.started_at).getTime())) * 100;

              return (
                <div
                  key={item.id}
                  className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-bold">{item.crafting_recipes?.recipe_name}</p>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(item.completes_at)}
                      </p>
                    </div>
                    {isReady && (
                      <button
                        onClick={() => claimCraftedItem(item)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Claim
                      </button>
                    )}
                  </div>
                  <div className="h-2 bg-[#202225] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isReady
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-orange-500 to-red-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Recipes */}
      <h3 className="text-lg font-bold text-white mb-4">Available Recipes</h3>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#0f0f0f] rounded-lg h-48"></div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No recipes available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const rarity = (recipe.result_item as any)?.rarity || 'common';
            const canCraft = (profile?.token_balance || 0) >= recipe.required_tokens;

            return (
              <div
                key={recipe.id}
                className="bg-[#0f0f0f] rounded-xl p-4 border-2 border-[#202225] hover:border-[#8B5CF6] transition-all cursor-pointer"
                onClick={() => setSelectedRecipe(recipe)}
              >
                {/* Recipe Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getRarityColor(rarity)} text-white text-xs font-bold`}>
                    {rarity.toUpperCase()}
                  </div>
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>

                <h4 className="text-white font-bold mb-2">{recipe.recipe_name}</h4>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{recipe.description}</p>

                {/* Requirements */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Tokens</span>
                    <span className={`font-bold ${canCraft ? 'text-green-500' : 'text-red-500'}`}>
                      {recipe.required_tokens} 🪙
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Time</span>
                    <span className="text-white font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {recipe.crafting_time_minutes}m
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startCrafting(recipe);
                  }}
                  disabled={!canCraft}
                  className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                    canCraft
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canCraft ? 'Start Crafting' : <Lock className="w-4 h-4 mx-auto" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-[#1a1a1a] rounded-2xl p-8 max-w-2xl w-full border border-[#202225]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-4">{selectedRecipe.recipe_name}</h2>
            <p className="text-gray-400 mb-6">{selectedRecipe.description}</p>

            {/* Requirements Detail */}
            <div className="bg-[#0f0f0f] rounded-lg p-4 mb-6">
              <h3 className="text-white font-bold mb-3">Requirements:</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Tokens</span>
                  <span className="text-yellow-500 font-bold">{selectedRecipe.required_tokens} 🪙</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Crafting Time</span>
                  <span className="text-white font-bold">{selectedRecipe.crafting_time_minutes} minutes</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  startCrafting(selectedRecipe);
                  setSelectedRecipe(null);
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Start Crafting
              </button>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="px-6 py-3 bg-[#0f0f0f] text-gray-400 rounded-xl font-semibold hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

