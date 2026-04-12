import React, { useState, useEffect } from 'react';
import api from './services/api';
import { 
  Activity as ActivityIcon, 
  Smartphone, 
  RefreshCw, 
  Link as LinkIcon, 
  FileUp, 
  CheckCircle2,
  Clock,
  Map,
  Zap,
  Heart
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatDate } from './lib/utils';

interface Activity {
  id: number;
  provider: string;
  type: string;
  distance: number;
  duration: number;
  startDate: string;
}

interface Integration {
  provider: string;
  lastSyncAt: string | null;
}

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [intRes, actRes] = await Promise.all([
        api.get('/integrations'),
        api.get('/activities')
      ]);
      setIntegrations(intRes.data);
      setActivities(actRes.data);
    } catch (err) {
      console.error('Failed to fetch integration data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (provider: string) => {
    if (provider === 'strava') {
      window.open('/api/auth/strava', 'Strava Connection', 'width=600,height=800');
    } else {
      alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} integration requires developer approval. Using manual import for now.`);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/sync');
      await fetchData();
    } catch (err) {
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleManualImport = async () => {
    setImporting(true);
    try {
      // Simulation of file import
      await api.post('/activities/import', {
        type: 'Run',
        distance: Math.floor(Math.random() * 10000) + 5000,
        duration: Math.floor(Math.random() * 3600) + 1800,
        date: new Date().toISOString()
      });
      await fetchData();
    } catch (err) {
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const isConnected = (provider: string) => integrations.some(i => i.provider === provider);

  const formatDistance = (m: number) => (m / 1000).toFixed(2) + ' km';
  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight">Connected Apps</h1>
        <p className="text-zinc-500 mt-2">Sync your fitness data directly from your favorite tracking services.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Strava Card */}
        <motion.div whileHover={{ y: -4 }} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm flex flex-col">
          <div className="w-16 h-16 bg-[#FC4C02]/10 rounded-2xl flex items-center justify-center mb-6">
            <Zap className="w-8 h-8 text-[#FC4C02]" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 mb-2">Strava</h3>
          <p className="text-zinc-500 text-sm mb-8 flex-1">Sync your runs, rides, and swims automatically from Strava.</p>
          {isConnected('strava') ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 py-3 px-4 rounded-xl justify-center">
                <CheckCircle2 className="w-5 h-5" /> Connected
              </div>
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => handleConnect('strava')}
              className="w-full py-4 bg-[#FC4C02] text-white rounded-xl font-bold hover:bg-[#E34402] transition-all flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-5 h-5" /> Connect Strava
            </button>
          )}
        </motion.div>

        {/* Garmin Card */}
        <motion.div whileHover={{ y: -4 }} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm flex flex-col">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
            <Smartphone className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 mb-2">Garmin</h3>
          <p className="text-zinc-500 text-sm mb-8 flex-1">Import activity files (FIT/GPX) exported from Garmin Connect.</p>
          <button 
            onClick={handleManualImport}
            disabled={importing}
            className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
          >
            <FileUp className="w-5 h-5" /> {importing ? 'Importing...' : 'Import FIT/GPX'}
          </button>
        </motion.div>

        {/* Apple Health Card */}
        <motion.div whileHover={{ y: -4 }} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm flex flex-col">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
            <Heart className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 mb-2">Apple Health</h3>
          <p className="text-zinc-500 text-sm mb-8 flex-1">Upload your workout exports from the Health app on your iPhone.</p>
          <button 
            onClick={handleManualImport}
            disabled={importing}
            className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
          >
            <FileUp className="w-5 h-5" /> Import Health Data
          </button>
        </motion.div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <ActivityIcon className="w-6 h-6 text-emerald-600" /> Recent Synced Activities
          </h2>
        </div>

        {activities.length > 0 ? (
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">Date</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">Type</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">Distance</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">Duration</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-8 py-6 text-sm text-zinc-900 font-medium">{formatDate(act.startDate)}</td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg uppercase">
                        {act.type}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-zinc-900 tracking-tight">{formatDistance(act.distance)}</td>
                    <td className="px-8 py-6 text-sm text-zinc-500">{formatDuration(act.duration)}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                        {act.provider === 'strava' ? <Zap className="w-3 h-3 text-[#FC4C02]" /> : <Smartphone className="w-3 h-3" />}
                        <span className="capitalize">{act.provider}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-50 rounded-[2.5rem] border border-dashed border-zinc-200">
            <ActivityIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-900">No activities synced yet</h3>
            <p className="text-zinc-500 text-sm mt-1">Connect an app to see your workout history here.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default IntegrationsPage;
