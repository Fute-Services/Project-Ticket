import { useState } from 'react';
import { motion } from 'framer-motion';
import AppShell from '../components/AppShell';
import ComplaintCard from '../components/ComplaintCard';
import { useAuth } from '../context/AuthContext';
import { searchHRByToken, searchITByToken } from '../utils/api';
import { Search } from 'lucide-react';

export default function TokenSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    const token = query.trim().toUpperCase();
    if (!token) return;

    setLoading(true);
    setSearched(true);
    setResult(null);
    try {
      if (token.includes('-IT-')) {
        const { data } = await searchITByToken(token);
        setResult(data);
      } else if (token.includes('-HR-')) {
        const { data } = await searchHRByToken(token);
        setResult(data);
      } else {
        // Unknown format — try HR then IT
        try {
          const { data } = await searchHRByToken(token);
          setResult(data);
        } catch {
          const { data } = await searchITByToken(token);
          setResult(data);
        }
      }
    } catch {
      // The API answers 404 for both "no such ticket" and "not yours", so the
      // message here must cover both without confirming a stranger's token.
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const staff = user && user.role !== 'employee';

  return (
    <AppShell width="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">Track a Ticket</h1>
      <p className="text-sm text-white/40 mb-6">
        {staff
          ? 'Enter a ticket token, e.g. FT-HR-A3X9K2'
          : 'Enter the token from one of your tickets, e.g. FT-HR-A3X9K2'}
      </p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="FT-HR-XXXXXX"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition text-sm font-mono"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition btn-glow disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <ComplaintCard complaint={result} deptTag={result.category ? 'IT' : 'HR'} />
        </motion.div>
      )}

      {searched && !loading && !result && (
        <div className="surface rounded-3xl p-10 text-center text-white/40">
          {staff
            ? 'No ticket found for that token.'
            : 'We couldn’t find that ticket under your account. Double-check the token — you can only track tickets you raised.'}
        </div>
      )}
    </AppShell>
  );
}
