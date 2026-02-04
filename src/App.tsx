import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Calendar, 
  PlusCircle, 
  Trash2,
  Wind
} from 'lucide-react';

// Simple Card Component for the Dashboard stats
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

export default function GardenMonitor() {
  // --- STATE ---
  const [logs, setLogs] = useState([
    { id: 1, date: '2023-10-24', temp: 22, rain: 0, notes: 'Sunny day, watered tomatoes.' },
    { id: 2, date: '2023-10-25', temp: 19, rain: 12, notes: 'Heavy rain, no watering needed.' },
    { id: 3, date: '2023-10-26', temp: 24, rain: 0, notes: 'Pruned the roses.' },
  ]);

  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split('T')[0],
    temp: '',
    rain: '',
    notes: ''
  });

  // --- HANDLERS ---
  const handleAddLog = (e) => {
    e.preventDefault();
    if (!newLog.temp && !newLog.rain) return; // Prevent empty logs

    const logEntry = {
      id: Date.now(),
      date: newLog.date,
      temp: Number(newLog.temp) || 0,
      rain: Number(newLog.rain) || 0,
      notes: newLog.notes
    };

    setLogs([logEntry, ...logs]);
    setNewLog({ date: new Date().toISOString().split('T')[0], temp: '', rain: '', notes: '' });
  };

  const handleDelete = (id) => {
    setLogs(logs.filter(log => log.id !== id));
  };

  // --- CALCULATIONS ---
  // Calculate averages for the dashboard
  const avgTemp = logs.length > 0 
    ? Math.round(logs.reduce((acc, curr) => acc + curr.temp, 0) / logs.length) 
    : 0;
  
  const totalRain = logs.reduce((acc, curr) => acc + curr.rain, 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
            <Sun className="text-yellow-500" />
            WP Garden Monitor
          </h1>
          <p className="text-gray-600">Track your weather and watering.</p>
        </header>

        {/* DASHBOARD STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            icon={Thermometer} 
            label="Avg Temp" 
            value={`${avgTemp}°C`} 
            color="bg-orange-500" 
          />
          <StatCard 
            icon={CloudRain} 
            label="Total Rain" 
            value={`${totalRain}mm`} 
            color="bg-blue-500" 
          />
          <StatCard 
            icon={Calendar} 
            label="Days Logged" 
            value={logs.length} 
            color="bg-green-500" 
          />
        </div>

        {/* INPUT FORM */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-green-600" />
            Add New Entry
          </h2>
          
          <form onSubmit={handleAddLog} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  value={newLog.date}
                  onChange={e => setNewLog({...newLog, date: e.target.value})}
                />
              </div>

              {/* Temp Input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Temp (°C)</label>
                <div className="relative">
                  <Thermometer className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="number" 
                    placeholder="25"
                    className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={newLog.temp}
                    onChange={e => setNewLog({...newLog, temp: e.target.value})}
                  />
                </div>
              </div>

              {/* Rain Input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rain (mm)</label>
                <div className="relative">
                  <CloudRain className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={newLog.rain}
                    onChange={e => setNewLog({...newLog, rain: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Notes Input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea 
                rows="2"
                placeholder="Watered the plants..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                value={newLog.notes}
                onChange={e => setNewLog({...newLog, notes: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Save Log
            </button>
          </form>
        </div>

        {/* LOG HISTORY (MOBILE FRIENDLY CARDS) */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">History</h2>
          
          {logs.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
              No logs yet. Add one above!
            </div>
          ) : (
            <div className="grid gap-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                  
                  {/* Top Row: Date and Delete */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-700">
                        {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDelete(log.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Middle Row: Stats (Separated) */}
                  <div className="flex gap-6">
                    {/* Temperature Section */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-100 rounded-md">
                        <Thermometer className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase font-bold">Temp</span>
                        <span className="font-medium text-gray-800">{log.temp}°C</span>
                      </div>
                    </div>

                    {/* Rainfall Section */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 rounded-md">
                        <CloudRain className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase font-bold">Rain</span>
                        <span className="font-medium text-gray-800">{log.rain}mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Notes */}
                  {log.notes && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md italic">
                      "{log.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}