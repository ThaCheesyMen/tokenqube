import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Vault, TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from './Toast';

interface SquadBank {
  id: string;
  squad_id: string;
  balance: number;
  created_at: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  from_user_id: string | null;
  to_user_id: string | null;
  description: string;
  created_at: string;
  user?: {
    username: string;
  };
}

interface Props {
  squadId: string;
  isLeader: boolean;
}

export default function SquadBank({ squadId, isLeader }: Props) {
  const { profile } = useAuth();
  const [bank, setBank] = useState<SquadBank | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);

  useEffect(() => {
    if (squadId) {
      fetchBankData();
      fetchTransactions();
    }
  }, [squadId]);

  const fetchBankData = async () => {
    try {
      const { data, error } = await supabase
        .from('squad_bank')
        .select('*')
        .eq('squad_id', squadId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        // Create bank if doesn't exist
        const { data: newBank } = await supabase
          .from('squad_bank')
          .insert({ squad_id: squadId, balance: 0 })
          .select()
          .single();
        setBank(newBank);
      } else {
        setBank(data);
      }
    } catch (error) {
      console.error('Error fetching bank data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('squad_bank_transactions')
        .select(`
          *,
          user:from_user_id (username)
        `)
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const deposit = async () => {
    if (!profile || !bank || depositAmount <= 0) return;

    if (depositAmount > (profile.token_balance || 0)) {
      toast.error('Insufficient tokens!');
      return;
    }

    try {
      // Deduct from user
      await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) - depositAmount })
        .eq('id', profile.id);

      // Add to squad bank
      await supabase
        .from('squad_bank')
        .update({ balance: bank.balance + depositAmount })
        .eq('id', bank.id);

      // Log transaction
      await supabase
        .from('squad_bank_transactions')
        .insert({
          squad_id: squadId,
          type: 'deposit',
          amount: depositAmount,
          from_user_id: profile.id,
          description: 'Member deposit'
        });

      toast.success(`Deposited ${depositAmount} tokens to squad bank! 💰`);
      setDepositAmount(0);
      fetchBankData();
      fetchTransactions();
    } catch (error) {
      console.error('Error depositing:', error);
      toast.error('Failed to deposit');
    }
  };

  const withdraw = async () => {
    if (!profile || !bank || withdrawAmount <= 0) return;

    if (!isLeader) {
      toast.error('Only squad leaders can withdraw!');
      return;
    }

    if (withdrawAmount > bank.balance) {
      toast.error('Insufficient squad bank balance!');
      return;
    }

    try {
      // Add to user
      await supabase
        .from('profiles')
        .update({ token_balance: (profile.token_balance || 0) + withdrawAmount })
        .eq('id', profile.id);

      // Deduct from squad bank
      await supabase
        .from('squad_bank')
        .update({ balance: bank.balance - withdrawAmount })
        .eq('id', bank.id);

      // Log transaction
      await supabase
        .from('squad_bank_transactions')
        .insert({
          squad_id: squadId,
          type: 'withdrawal',
          amount: withdrawAmount,
          to_user_id: profile.id,
          description: 'Leader withdrawal'
        });

      toast.success(`Withdrew ${withdrawAmount} tokens! 💸`);
      setWithdrawAmount(0);
      fetchBankData();
      fetchTransactions();
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast.error('Failed to withdraw');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] animate-pulse">
        <div className="h-8 bg-[#0f0f0f] rounded mb-4"></div>
        <div className="h-32 bg-[#0f0f0f] rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Vault className="w-5 h-5 text-yellow-500" />
          Squad Treasury
        </h3>
        <div className="text-right">
          <p className="text-3xl font-bold text-yellow-500">{bank?.balance || 0} 🪙</p>
          <p className="text-sm text-gray-400">Total Balance</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Deposit */}
        <div className="bg-[#0f0f0f] rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
            <ArrowDownLeft className="w-4 h-4" />
            Deposit
          </p>
          <input
            type="number"
            value={depositAmount || ''}
            onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
            placeholder="Amount"
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#202225] rounded-lg text-white mb-2 focus:border-[#8B5CF6] focus:outline-none"
          />
          <button
            onClick={deposit}
            disabled={depositAmount <= 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Deposit
          </button>
        </div>

        {/* Withdraw */}
        <div className="bg-[#0f0f0f] rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            Withdraw {!isLeader && '(Leader Only)'}
          </p>
          <input
            type="number"
            value={withdrawAmount || ''}
            onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
            placeholder="Amount"
            disabled={!isLeader}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#202225] rounded-lg text-white mb-2 focus:border-[#8B5CF6] focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            onClick={withdraw}
            disabled={!isLeader || withdrawAmount <= 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h4 className="text-white font-semibold mb-3">Recent Transactions</h4>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No transactions yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    tx.type === 'deposit' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {tx.type === 'deposit' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold capitalize">
                      {tx.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      by {tx.user?.username || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount} 🪙
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

