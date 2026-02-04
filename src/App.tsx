import React, { useState, useEffect } from 'react';
import { 
  CloudRain, 
  Droplets, 
  MapPin, 
  Calendar, 
  X, 
  Moon, 
  Sun,
  Trash2,
  History,
  Plus,
  Save,
  ThermometerSnowflake,
  Wind
} from 'lucide-react';

function GardenMonitor() {
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  
  // Weather State
  const [currentWeather, setCurrentWeather] = useState({
    temp: '--', 
    humidity: '--',
    isDay: 1,
    code: 0
  });

  // Historical Weather (Last 7 days for algorithm)
  const [historyData, setHistoryData] = useState([]);

  // Zones
  const [zones] = useState([
    { id: 'z1', name: 'In-Ground Garden', type: 'ground' },
    { id: 'z2', name: 'Urns', type: 'container' } // Renamed here
  ]);

  // Watering Events (Mocked initial data, but editable)
  const [wateringEvents, setWateringEvents] = useState([
    { id: 'e1', zoneId: 'z1', date: '2024-02-01' }, 
    { id: 'e2', zoneId: 'z2', date: '2024-02-03' }, 
  ]);

  // --- API & DATA FETCHING ---

  // Wicker Park, Chicago Coordinates
  const LAT = 41.90;
  const LON = -87.67;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Current Weather
        const currentRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,is_day,weather_code&temperature_unit=fahrenheit`
        );
        const currentJson = await currentRes.json();
        
        setCurrentWeather({
          temp: Math.round(currentJson.current.temperature_2m),
          humidity: currentJson.current.relative_humidity_2m,
          isDay: currentJson.current.is_day,
          code: currentJson.current.weather_code
        });

        // 2. Fetch Last 7 Days History (Rain & Temp)
        // Calculate dates
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        const formatDate = (d) => d.toISOString().split('T')[0];
        
        const historyRes = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&daily=temperature_2m_max,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch`
        );
        const historyJson = await historyRes.json();

        // Format history into a usable array
        const formattedHistory = historyJson.daily.time.map((date, i) => ({
          date: date,
          maxTemp: historyJson.daily.temperature_2m_max[i],
          rain: historyJson.daily.precipitation_sum[i]
        }));

        setHistoryData(formattedHistory);
        setLoading(false);

      } catch (error) {
        console.error("Failed to fetch weather data", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- ALGORITHM ---

  // Helper to interpret WMO weather codes
  const getWeatherDescription = (code) => {
    if (code === 0) return "Clear";
    if (code >= 1 && code <= 3) return "Partly Cloudy";
    if (code >= 45 && code <= 48) return "Foggy";
    if (code >= 51 && code <= 67) return "Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Showers";
    if (code >= 95) return "Thunderstorm";
    return "Unknown";
  };

  // Calculate Moisture based on REAL history
  // This runs through the last 7 days of weather + logs to determine current status
  const calculateMoistureHistory = (zoneType, zoneId) => {
    if (historyData.length === 0) return [];

    let currentMoisture = 80; // Start assumption 7 days ago
    const dailyStats = [];

    historyData.forEach(day => {
      // 1. Evaporation (Loss)
      // Hotter = more loss. Pots lose faster than ground.
      let evaporation = 0;
      if (day.maxTemp > 80) evaporation = 15;
      else if (day.maxTemp > 60) evaporation = 10;
      else if (day.maxTemp > 40) evaporation = 5;
      else evaporation = 2; // Very little loss in cold

      if (zoneType === 'container') evaporation *= 1.5; // Pots dry faster

      // 2. Rain (Gain)
      // Ground captures rain better than pots
      let rainGain = day.rain * 50; // 1 inch of rain = +50% moisture (roughly)
      if (zoneType === 'container') rainGain *= 0.8; // Pots might shed some rain or have less surface area

      // 3. User Watering (Gain)
      const watered = wateringEvents.some(e => e.zoneId === zoneId && e.date === day.date);
      const waterGain = watered ? 100 : 0; // Reset to full if watered

      // Calculate
      if (watered) {
        currentMoisture = 100;
      } else {
        currentMoisture = currentMoisture - evaporation + rainGain;
      }

      // Clamp
      currentMoisture = Math.max(0, Math.min(100, currentMoisture));

      dailyStats.push({
        date: day.date,
        moisture: Math.round(currentMoisture),
        rain: day.rain,
        temp: day.maxTemp,
        watered
      });
    });

    return dailyStats;
  };

  // Get the *current* (most recent) moisture level from the algo
  const getCurrentMoisture = (zone) => {
    const stats = calculateMoistureHistory(zone.type, zone.id);
    if (stats.length === 0) return 50; // default
    return stats[stats.length - 1].moisture;
  };

  // --- ACTIONS ---

  const initiateWatering = (zoneId) => {
    // Default to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setActiveZoneId(zoneId);
  };

  const confirmWatering = () => {
    if (!activeZoneId || !selectedDate) return;

    const newEvent = {
      id: Math.random().toString(36).substr(2, 9),
      zoneId: activeZoneId,
      date: selectedDate
    };
    
    setWateringEvents(prev => [newEvent, ...prev]);
    setActiveZoneId(null);
  };

  const handleDeleteEvent = (eventId) => {
    if(window.confirm("Remove this log entry?")) {
      setWateringEvents(prev => prev.filter(e => e.id !== eventId));
    }
  };

  // --- STYLES ---
  const styles = `
    .app-container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      min-height: 100vh;
      color: #e2e8f0;
      padding-bottom: 40px;
    }
    
    /* Header */
    .top-nav {
      background: #1e293b;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .app-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: #f8fafc; }
    .location-tag { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }
    .log-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #334155;
      border: 1px solid #475569;
      padding: 8px 16px;
      border-radius: 20px;
      color: #e2e8f0;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .log-btn:hover { background: #475569; }

    /* Main Content */
    .main-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    /* Weather Widget */
    .weather-card {
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      color: white;
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      border: 1px solid #4338ca;
    }
    .weather-header { display: flex; justify-content: space-between; align-items: center; }
    .temp-display { display: flex; align-items: flex-end; gap: 12px; }
    .temp-val { font-size: 3rem; font-weight: 800; line-height: 1; }
    .temp-cond { font-size: 1.25rem; font-weight: 500; opacity: 0.9; margin-bottom: 6px; }
    .uv-badge { background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; text-align: center; }
    .weather-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
    .weather-stat { display: flex; align-items: center; gap: 12px; }
    .weather-stat p { margin: 0; }
    .stat-label { font-size: 0.75rem; opacity: 0.8; }
    .stat-val { font-weight: 600; }

    /* Zones Grid */
    .zones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .zone-card {
      background: #1e293b;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #334155;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .zone-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .zone-title { margin: 0; font-size: 1.1rem; font-weight: 700; color: #f1f5f9; }
    .zone-type { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; }
    
    .moisture-stat { text-align: right; }
    .moisture-val { font-size: 2rem; font-weight: 800; display: block; line-height: 1; }
    .moisture-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; }
    
    .status-ok { color: #34d399; }
    .status-low { color: #fb923c; }

    .progress-track { background: #334155; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
    .progress-fill { height: 100%; transition: width 1s ease; }
    .fill-ok { background: #34d399; }
    .fill-low { background: #fb923c; }

    /* Action Area */
    .action-area { margin-top: auto; }
    
    .water-btn {
      width: 100%;
      padding: 12px;
      border-radius: 12px;
      border: none;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      background: #3b82f6;
      color: white;
    }
    .water-btn:hover { background: #2563eb; }

    /* Picker Overlay */
    .picker-overlay {
      background: #334155;
      border: 1px solid #475569;
      border-radius: 12px;
      padding: 16px;
      margin-top: 8px;
      animation: slideDown 0.2s ease-out;
    }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    .date-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #475569;
      background: #1e293b;
      color: white;
      border-radius: 8px;
      margin-bottom: 12px;
      font-family: inherit;
      font-size: 1rem;
      color-scheme: dark;
    }
    
    .picker-actions { display: flex; flex-direction: column; gap: 8px; }
    
    .confirm-btn { 
      width: 100%;
      background: #10b981; 
      color: white; 
      border: none; 
      padding: 12px; 
      border-radius: 8px; 
      font-weight: 700; 
      font-size: 1rem;
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      gap: 8px; 
    }
    .confirm-btn:hover { background: #059669; }

    .cancel-btn { 
      width: 100%;
      background: transparent; 
      color: #94a3b8; 
      border: 1px solid #475569; 
      padding: 8px; 
      border-radius: 8px; 
      font-weight: 600; 
      cursor: pointer; 
    }
    .cancel-btn:hover { color: white; border-color: white; }


    /* Modal / Popup */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }
    .modal-content {
      background: #1e293b;
      width: 100%;
      max-width: 600px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
      border: 1px solid #334155;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      color: #f1f5f9;
    }
    
    .modal-header {
      padding: 16px 20px;
      background: #0f172a;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title { font-weight: 700; color: #f1f5f9; display: flex; align-items: center; gap: 8px; margin: 0; }
    .close-btn { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; }
    .close-btn:hover { color: white; }

    .modal-body { overflow-y: auto; padding: 0; }

    /* Log Table */
    .section-header { padding: 16px 20px 8px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; }
    .log-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .log-table th { text-align: left; padding: 12px 20px; background: #0f172a; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; }
    .log-table td { padding: 12px 20px; border-bottom: 1px solid #334155; vertical-align: middle; }
    
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-blue { background: #1e3a8a; color: #93c5fd; }
    .badge-gray { background: #334155; color: #cbd5e1; }
    
    .note-ok { color: #34d399; font-weight: 600; font-size: 0.85rem; }
    .note-warn { color: #fb923c; font-weight: 600; font-size: 0.85rem; }

    /* History List */
    .history-list { padding: 0 20px 20px; }
    .history-item { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 12px 0; 
      border-bottom: 1px solid #334155; 
    }
    .history-item:last-child { border-bottom: none; }
    .h-info { display: flex; flex-direction: column; }
    .h-zone { font-weight: 600; color: #f1f5f9; font-size: 0.95rem; }
    .h-time { font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
    
    .delete-btn {
      background: #450a0a;
      color: #fca5a5;
      border: none;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .delete-btn:hover { background: #7f1d1d; color: white; }

    .empty-state { text-align: center; padding: 20px; color: #64748b; font-size: 0.9rem; font-style: italic; }
  `;

  if (loading) {
    return (
      <div className="app-container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
        <style>{styles}</style>
        <div style={{textAlign:'center'}}>
          <div style={{marginBottom:'16px'}}><CloudRain size={48} className="animate-bounce" color="#3b82f6"/></div>
          <p>Fetching live weather data for Chicago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <style>{styles}</style>
      
      {/* HEADER & NAV */}
      <div className="top-nav">
        <div>
          <h1 className="app-title">Garden Monitor</h1>
          <div className="location-tag">
            <MapPin size={12} />
            Wicker Park, Chicago
          </div>
        </div>
        <button onClick={() => setShowLog(true)} className="log-btn">
          <Calendar size={18} />
          <span>View Log</span>
        </button>
      </div>

      <div className="main-content">

        {/* 1. WEATHER DASHBOARD (LIVE) */}
        <div className="weather-card">
          <div className="weather-header">
            <div>
              <p style={{marginBottom: '4px', opacity: 0.8}}>Current Conditions</p>
              <div className="temp-display">
                <span className="temp-val">{currentWeather.temp}°</span>
                <span className="temp-cond">{getWeatherDescription(currentWeather.code)}</span>
              </div>
            </div>
            <div className="uv-badge">
              {currentWeather.isDay ? <Sun size={24} color="#fcd34d" /> : <Moon size={24} color="#e2e8f0" />}
              <div style={{fontSize: '0.7rem', marginTop:'4px'}}>{currentWeather.isDay ? 'Day' : 'Night'}</div>
            </div>
          </div>
          
          <div className="weather-grid">
            <div className="weather-stat">
              <Droplets size={20} color="#a5b4fc" />
              <div>
                <p className="stat-label">Humidity</p>
                <p className="stat-val">{currentWeather.humidity}%</p>
              </div>
            </div>
            <div className="weather-stat">
              <ThermometerSnowflake size={20} color="#a5b4fc" />
              <div>
                <p className="stat-label">Frost Risk</p>
                <p className="stat-val">{currentWeather.temp < 36 ? 'High' : 'Low'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ZONES */}
        <div className="zones-grid">
          {zones.map(zone => {
            const moisture = getCurrentMoisture(zone);
            const isLow = moisture < 40;
            const isPickerOpen = activeZoneId === zone.id;
            
            // Find last watered date
            const zoneEvents = wateringEvents.filter(e => e.zoneId === zone.id);
            const lastWatered = zoneEvents.length > 0 
              ? zoneEvents.sort((a,b) => new Date(b.date) - new Date(a.date))[0].date
              : null;

            return (
              <div key={zone.id} className="zone-card">
                <div>
                  <div className="zone-header">
                    <div>
                      <h3 className="zone-title">{zone.name}</h3>
                      <span className="zone-type">
                        {zone.type === 'ground' ? 'In-Ground' : 'Container'}
                      </span>
                    </div>
                    <div className={`moisture-stat ${isLow ? 'status-low' : 'status-ok'}`}>
                      <span className="moisture-val">{moisture}%</span>
                      <span className="moisture-label">Moisture</span>
                    </div>
                  </div>

                  {/* Moisture Bar */}
                  <div className="progress-track">
                    <div 
                      className={`progress-fill ${isLow ? 'fill-low' : 'fill-ok'}`} 
                      style={{ width: `${moisture}%` }}
                    />
                  </div>

                  <div style={{fontSize: '0.85rem', color: '#94a3b8', marginBottom: '24px'}}>
                     Last watered: <strong style={{color: '#e2e8f0'}}>{lastWatered || 'Never'}</strong>
                  </div>
                </div>

                <div className="action-area">
                  {!isPickerOpen ? (
                    <button onClick={() => initiateWatering(zone.id)} className="water-btn">
                      <Plus size={18} />
                      Log Water
                    </button>
                  ) : (
                    <div className="picker-overlay">
                      <label style={{display:'block', fontSize:'0.8rem', fontWeight:'600', marginBottom:'8px', color:'#cbd5e1'}}>
                        Select Date:
                      </label>
                      <input 
                        type="date" 
                        className="date-input"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                      <div className="picker-actions">
                        <button onClick={confirmWatering} className="confirm-btn">
                          <Save size={18} /> Save Date
                        </button>
                        <button onClick={() => setActiveZoneId(null)} className="cancel-btn">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. THE LOG MODAL */}
      {showLog && (
        <div className="modal-overlay">
          <div className="modal-content">
            
            {/* Modal Header */}
            <div className="modal-header">
              <h2 className="modal-title">
                <Calendar size={20} color="#3b82f6" />
                Garden Log
              </h2>
              <button onClick={() => setShowLog(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="modal-body">
              
              {/* SECTION A: EDITABLE HISTORY */}
              <div className="section-header">Recent Log Entries</div>
              <div className="history-list">
                {wateringEvents.length === 0 ? (
                  <div className="empty-state">No watering recorded yet.</div>
                ) : (
                  wateringEvents
                    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Newest first
                    .map(event => {
                      const zoneName = zones.find(z => z.id === event.zoneId)?.name || 'Unknown Zone';
                      return (
                        <div key={event.id} className="history-item">
                          <div className="h-info">
                            <span className="h-zone">{zoneName}</span>
                            <span className="h-time">
                              <History size={12} />
                              {event.date}
                            </span>
                          </div>
                          <button 
                            className="delete-btn" 
                            title="Delete this entry"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                )}
              </div>

              {/* SECTION B: 7-DAY OVERVIEW (LIVE DATA) */}
              <div className="section-header" style={{borderTop: '1px solid #334155', paddingTop: '16px'}}>
                7-Day Analysis (Based on Live Weather)
              </div>
              <div style={{padding: '0 20px 10px', fontSize: '0.8rem', color: '#64748b'}}>
                Showing moisture levels for In-Ground Garden based on actual rain & temp.
              </div>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weather</th>
                    <th>Moisture</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMoistureHistory('ground', 'z1').reverse().map((day, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{fontWeight: 600, color: '#f1f5f9'}}>{day.date}</div>
                      </td>
                      <td>
                        <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                          {day.rain > 0.1 ? <CloudRain size={14} color="#60a5fa"/> : <Sun size={14} color="#fbbf24"/>}
                          <span style={{fontSize:'0.75rem', color:'#94a3b8'}}>
                            {day.rain > 0 ? `${day.rain}"` : `${Math.round(day.temp)}°`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{day.moisture}%</span>
                      </td>
                      <td>
                        {day.watered ? (
                          <span className="badge badge-gray">Watered</span>
                        ) : day.moisture < 40 ? (
                          <span className="note-warn">Dry</span>
                        ) : (
                          <span className="note-ok">Good</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: '16px', background: '#0f172a', borderTop: '1px solid #334155', textAlign: 'center', flexShrink: 0 }}>
              <button 
                onClick={() => setShowLog(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default GardenMonitor;