import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Star, ThumbsUp, MessageSquare, Shield, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from './Toast';

interface Review {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: {
    username: string;
    avatar_url?: string;
  };
  marketplace_transactions?: {
    marketplace_items: {
      item_name: string;
    };
  };
}

interface MarketplaceReviewsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function MarketplaceReviews({ userId, isOwnProfile }: MarketplaceReviewsProps) {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  });
  
  // Write review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });

  useEffect(() => {
    fetchReviews();
    if (isOwnProfile) {
      fetchPendingReviews();
    }
  }, [userId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_reviews')
        .select(`
          *,
          reviewer:profiles!marketplace_reviews_reviewer_id_fkey(username, avatar_url),
          marketplace_transactions(marketplace_items(item_name))
        `)
        .eq('reviewed_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      setTotalReviews(data?.length || 0);

      if (data && data.length > 0) {
        // Calculate average rating
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(avg);

        // Calculate rating distribution
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        data.forEach(review => {
          distribution[review.rating as keyof typeof distribution]++;
        });
        setRatingDistribution(distribution);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    if (!profile) return;

    try {
      // Get completed transactions where user hasn't left a review yet
      const { data: transactions } = await supabase
        .from('marketplace_transactions')
        .select(`
          *,
          marketplace_items(item_name, seller_id),
          seller:profiles!marketplace_transactions_seller_id_fkey(username)
        `)
        .eq('buyer_id', profile.id)
        .eq('transaction_status', 'completed')
        .eq('delivery_status', 'delivered');

      if (transactions) {
        // Filter out transactions that already have reviews
        const { data: existingReviews } = await supabase
          .from('marketplace_reviews')
          .select('transaction_id')
          .eq('reviewer_id', profile.id);

        const reviewedTxIds = new Set(existingReviews?.map(r => r.transaction_id) || []);
        const pending = transactions.filter(tx => !reviewedTxIds.has(tx.id));
        
        setPendingTransactions(pending);
      }
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    }
  };

  const handleStartReview = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!profile || !selectedTransaction) return;

    if (!reviewForm.comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    try {
      const { error } = await supabase
        .from('marketplace_reviews')
        .insert([{
          transaction_id: selectedTransaction.id,
          reviewer_id: profile.id,
          reviewed_id: selectedTransaction.marketplace_items.seller_id,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        }]);

      if (error) throw error;

      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      setReviewForm({ rating: 5, comment: '' });
      fetchReviews();
      fetchPendingReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#0f0f0f] rounded w-1/3"></div>
          <div className="h-20 bg-[#0f0f0f] rounded"></div>
          <div className="h-20 bg-[#0f0f0f] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Reviews Banner (if own profile) */}
      {isOwnProfile && pendingTransactions.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <MessageSquare className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-white font-bold mb-2">Pending Reviews ({pendingTransactions.length})</h3>
              <p className="text-gray-300 text-sm mb-4">
                You have {pendingTransactions.length} completed purchase{pendingTransactions.length !== 1 ? 's' : ''} waiting for your review
              </p>
              <div className="space-y-2">
                {pendingTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between bg-[#1a1a1a]/50 rounded-lg p-3">
                    <div>
                      <p className="text-white font-semibold">{tx.marketplace_items.item_name}</p>
                      <p className="text-sm text-gray-400">Purchased from {tx.seller.username}</p>
                    </div>
                    <button
                      onClick={() => handleStartReview(tx)}
                      className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
                    >
                      Write Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Summary */}
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
        <h3 className="text-xl font-bold text-white mb-6">Seller Reviews</h3>

        {totalReviews === 0 ? (
          <div className="text-center py-8">
            <Star className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No reviews yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-2">{averageRating.toFixed(1)}</div>
              {renderStars(Math.round(averageRating), 'lg')}
              <p className="text-gray-400 mt-2">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
            </div>

            {/* Rating Distribution */}
            <div className="lg:col-span-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                return (
                  <div key={rating} className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-white font-semibold">{rating}</span>
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="flex-1 h-3 bg-[#0f0f0f] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-400 text-sm w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Individual Reviews */}
      {reviews.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
          <h3 className="text-xl font-bold text-white mb-6">Recent Reviews</h3>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
                <div className="flex items-start gap-4">
                  {/* Reviewer Avatar */}
                  <div className="w-12 h-12 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {review.reviewer?.username?.charAt(0).toUpperCase()}
                  </div>

                  {/* Review Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold">{review.reviewer?.username}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()} •{' '}
                          {review.marketplace_transactions?.marketplace_items.item_name}
                        </p>
                      </div>
                      {renderStars(review.rating, 'sm')}
                    </div>
                    <p className="text-gray-300 text-sm">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {showReviewModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#202225]">
              <h3 className="text-xl font-bold text-white">Write a Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 hover:bg-[#2f3136] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Transaction Info */}
              <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
                <p className="text-sm text-gray-400 mb-1">Item Purchased</p>
                <p className="text-white font-semibold">{selectedTransaction.marketplace_items.item_name}</p>
                <p className="text-sm text-gray-400 mt-1">
                  From {selectedTransaction.seller.username}
                </p>
              </div>

              {/* Rating Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-3">
                  Your Rating *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= reviewForm.rating 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-600 hover:text-gray-500'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-3 text-white font-semibold text-lg">
                    {reviewForm.rating}.0
                  </span>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Your Review *
                </label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience with this seller..."
                  rows={5}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#202225] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{reviewForm.comment.length}/500 characters</p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm mb-1">Review Guidelines</p>
                  <p className="text-gray-400 text-xs">
                    Be honest and constructive. Reviews help maintain a trustworthy marketplace for everyone.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSubmitReview}
                  disabled={!reviewForm.comment.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  Submit Review
                </button>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-6 py-3 bg-[#2f3136] hover:bg-[#36393f] text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

