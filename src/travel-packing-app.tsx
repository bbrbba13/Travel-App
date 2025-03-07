import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Activity, Plus, X, Thermometer, Luggage, ChevronRight, ChevronLeft } from 'lucide-react';

// TypeScript interfaces
interface MapboxFeature {
  place_name: string;
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MapboxResponse {
  features: MapboxFeature[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface WeatherDay {
  date: string;
  high: number;
  low: number;
  conditions: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PackingItem {
  name: string;
  category: string;
  quantity: number;
}

const PackingApp: React.FC = () => {
  // App states with proper typing
  const [destination, setDestination] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activities, setActivities] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState<string>('');
  const [weatherData, setWeatherData] = useState<WeatherDay[] | null>(null);
  const [packingList, setPackingList] = useState<PackingItem[]>([]);

  // Ref for the suggestions dropdown and timeout
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Helper function to handle date timezone issues
  const getLocalDate = (dateString: string): Date => {
    const date = new Date(dateString);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  };

  // Add these helper functions after the interfaces
  const validateApiKeys = (): { mapbox: boolean; weather: boolean } => {
    return {
      mapbox: !!process.env.REACT_APP_MAPBOX_API_KEY,
      weather: !!process.env.REACT_APP_OPENWEATHER_API_KEY
    };
  };

  const handleApiKeyError = (service: string): void => {
    console.error(`${service} API key is not configured. Please check your environment variables.`);
    if (process.env.NODE_ENV === 'development') {
      console.info(`For development, add your API keys to your .env file:
      REACT_APP_MAPBOX_API_KEY=your_mapbox_key
      REACT_APP_OPENWEATHER_API_KEY=your_openweather_key
      
      For production, add these to your Vercel environment variables.`);
    }
  };

  // Update the searchCities function
  const searchCities = async (query: string): Promise<string[]> => {
    if (query.length < 2) return [];

    const { mapbox } = validateApiKeys();
    if (!mapbox) {
      handleApiKeyError('Mapbox');
      return [`Demo City ${Math.floor(Math.random() * 100)}`];
    }

    try {
      const MAPBOX_API_KEY = process.env.REACT_APP_MAPBOX_API_KEY;
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_API_KEY}&types=place&limit=10`;

      const response = await fetch(geocodingUrl);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: any = await response.json();
      if (!data || !Array.isArray(data.features)) {
        return [];
      }
      
      return data.features.map((feature: MapboxFeature) => feature.place_name);

    } catch (error) {
      console.error('API error details:', error);
      return [`Demo City ${Math.floor(Math.random() * 100)}`];
    }
  };

  // Handle destination input change
  const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDestination(value);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.length >= 2) {
      setShowSuggestions(true);
      setSearchLoading(true);

      timeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchCities(value);
          setSuggestions(results);
        } catch (err) {
          console.error("Error in city search:", err);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle suggestion selection
  const selectSuggestion = (city: string): void => {
    setDestination(city);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const targetNode = event.target as Node;
      if (suggestionsRef.current && !suggestionsRef.current.contains(targetNode)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation handlers
  const handleNextStep = (): void => {
    if (currentStep === 1 && destination && startDate && endDate) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      generateWeatherData();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      generatePackingList();
      setCurrentStep(4);
    }
  };

  const handleBackStep = (): void => {
    setCurrentStep(currentStep - 1);
  };

  const addActivity = (): void => {
    if (newActivity.trim()) {
      setActivities([...activities, newActivity.trim()]);
      setNewActivity('');
    }
  };

  const removeActivity = (index: number): void => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && newActivity.trim()) {
      addActivity();
    }
  };

  // Update the fetchWeatherData function
  const fetchWeatherData = async (city: string, startDate: string, endDate: string): Promise<WeatherDay[]> => {
    const { weather } = validateApiKeys();
    if (!weather) {
      handleApiKeyError('OpenWeather');
      throw new Error('Weather API key not configured');
    }

    try {
      const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_API_KEY}`;
      
      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) {
        throw new Error(`Weather API error: ${geoResponse.status}`);
      }

      const geoData = await geoResponse.json();
      
      if (!geoData || geoData.length === 0) {
        throw new Error('City not found');
      }

      const { lat, lon } = geoData[0];

      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`;
      const forecastResponse = await fetch(forecastUrl);
      
      if (!forecastResponse.ok) {
        throw new Error(`Weather API error: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();

      if (!forecastData || !forecastData.list) {
        throw new Error('Weather data not available');
      }

      const start = getLocalDate(startDate);
      const end = getLocalDate(endDate);
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const weatherMap = new Map<string, WeatherDay>();

      // Group forecast data by day
      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const dateStr = date.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });

        if (!weatherMap.has(dateStr)) {
          weatherMap.set(dateStr, {
            date: dateStr,
            high: item.main.temp_max,
            low: item.main.temp_min,
            conditions: item.weather[0].main,
            icon: item.weather[0].icon
          });
        } else {
          const existing = weatherMap.get(dateStr)!;
          existing.high = Math.max(existing.high, item.main.temp_max);
          existing.low = Math.min(existing.low, item.main.temp_min);
        }
      });

      // Convert the weather map to an array
      const weatherData = Array.from(weatherMap.values());

      // If trip is longer than available forecast, estimate remaining days
      if (days > weatherData.length) {
        const lastDay = weatherData[weatherData.length - 1];
        for (let i = weatherData.length; i < days; i++) {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          weatherData.push({
            date: date.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }),
            high: lastDay.high,
            low: lastDay.low,
            conditions: lastDay.conditions,
            icon: lastDay.icon
          });
        }
      }

      return weatherData;

    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  };

  // Update the generateWeatherData function to show a more informative error message
  const generateWeatherData = async (): Promise<void> => {
    try {
      const weatherData = await fetchWeatherData(destination, startDate, endDate);
      setWeatherData(weatherData);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      
      // Show different message based on the error
      let errorMessage = 'Using fallback weather data due to API error.';
      if ((error as Error).message === 'Weather API key not configured') {
        errorMessage = 'Using demo weather data (API key not configured)';
      }
      
      console.info(errorMessage);
      
      // Fallback to mock data
      const start = getLocalDate(startDate);
      const end = getLocalDate(endDate);
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const mockWeather: WeatherDay[] = Array(days).fill(null).map((_, i) => {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        return {
          date: date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          high: Math.floor(Math.random() * 15) + 65,
          low: Math.floor(Math.random() * 15) + 45,
          conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
          icon: '01d'
        };
      });
      setWeatherData(mockWeather);
    }
  };

  // Helper function to analyze weather patterns
  const analyzeWeather = (weatherData: WeatherDay[]) => {
    const avgHigh = weatherData.reduce((sum, day) => sum + day.high, 0) / weatherData.length;
    const avgLow = weatherData.reduce((sum, day) => sum + day.low, 0) / weatherData.length;
    const hasRain = weatherData.some(day => day.conditions.includes('Rain'));
    const tempVariation = Math.max(...weatherData.map(day => day.high)) - Math.min(...weatherData.map(day => day.low));
    
    return {
      avgHigh,
      avgLow,
      hasRain,
      tempVariation,
      isHot: avgHigh > 80,
      isMild: avgHigh >= 60 && avgHigh <= 80,
      isCool: avgLow < 60 && avgLow >= 40,
      isCold: avgLow < 40,
      needsLayering: tempVariation > 20
    };
  };

  // AI-driven packing list generation
  const generatePackingList = (): void => {
    const start = getLocalDate(startDate);
    const end = getLocalDate(endDate);
    const tripDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (!weatherData) return;
    
    const weather = analyzeWeather(weatherData);
    const items: PackingItem[] = [];

    // AI Decision Making for Clothing Based on Weather Patterns
    const addClothingItems = () => {
      // Base clothing calculations
      const topsPerDay = weather.needsLayering ? 2 : 1;
      const extraItems = Math.ceil(tripDays / 3); // Buffer for unexpected needs

      // Essential clothing with smart quantities
      items.push(
        { name: 'Underwear', category: 'Clothing', quantity: tripDays + 1 },
        { name: 'Socks', category: 'Clothing', quantity: tripDays + 1 }
      );

      if (weather.isHot) {
        items.push(
          { name: 'Breathable T-shirts', category: 'Clothing', quantity: tripDays },
          { name: 'Lightweight Shorts', category: 'Clothing', quantity: Math.ceil(tripDays / 2) },
          { name: 'Sun Protection Shirt', category: 'Clothing', quantity: 1 }
        );
      }

      if (weather.isMild) {
        items.push(
          { name: 'Casual Shirts', category: 'Clothing', quantity: Math.ceil(tripDays * 0.7) },
          { name: 'Light Sweater', category: 'Clothing', quantity: 1 },
          { name: 'Comfortable Pants', category: 'Clothing', quantity: Math.ceil(tripDays / 3) }
        );
      }

      if (weather.isCool || weather.needsLayering) {
        items.push(
          { name: 'Long Sleeve Shirts', category: 'Clothing', quantity: Math.ceil(tripDays * topsPerDay * 0.5) },
          { name: 'Light Jacket', category: 'Clothing', quantity: 1 },
          { name: 'Warm Sweater', category: 'Clothing', quantity: Math.ceil(tripDays / 3) }
        );
      }

      if (weather.isCold) {
        items.push(
          { name: 'Warm Base Layer Set', category: 'Clothing', quantity: 2 },
          { name: 'Winter Coat', category: 'Clothing', quantity: 1 },
          { name: 'Warm Hat', category: 'Accessories', quantity: 1 },
          { name: 'Gloves', category: 'Accessories', quantity: 1 },
          { name: 'Scarf', category: 'Accessories', quantity: 1 },
          { name: 'Thermal Socks', category: 'Clothing', quantity: Math.ceil(tripDays / 2) }
        );
      }
    };

    // AI Decision Making for Activities
    const addActivityItems = () => {
      activities.forEach(activity => {
        const lowercaseActivity = activity.toLowerCase();
        
        // Smart activity-based additions
        if (lowercaseActivity.includes('beach') || lowercaseActivity.includes('swim')) {
          const beachDays = Math.ceil(tripDays / 3); // Assume not every day is a beach day
          items.push(
            { name: 'Swimsuit', category: 'Clothing', quantity: Math.min(2, beachDays) },
            { name: 'Beach Towel', category: 'Accessories', quantity: 1 },
            { name: 'Waterproof Phone Case', category: 'Accessories', quantity: 1 },
            { name: 'Beach Bag', category: 'Accessories', quantity: 1 }
          );
          
          if (weather.isHot) {
            items.push(
              { name: 'Extra Sunscreen', category: 'Toiletries', quantity: 1 },
              { name: 'After-Sun Care', category: 'Toiletries', quantity: 1 }
            );
          }
        }

        if (lowercaseActivity.includes('hik')) {
          const hikingDays = Math.ceil(tripDays / 3);
          items.push(
            { name: 'Hiking Boots', category: 'Footwear', quantity: 1 },
            { name: 'Hiking Socks', category: 'Clothing', quantity: hikingDays + 1 },
            { name: 'Moisture-Wicking Shirts', category: 'Clothing', quantity: hikingDays },
            { name: 'Hiking Pants', category: 'Clothing', quantity: Math.ceil(hikingDays / 2) },
            { name: 'First Aid Kit', category: 'Safety', quantity: 1 }
          );

          if (weather.hasRain) {
            items.push(
              { name: 'Waterproof Jacket', category: 'Clothing', quantity: 1 },
              { name: 'Quick-Dry Pants', category: 'Clothing', quantity: 1 }
            );
          }
        }

        if (lowercaseActivity.includes('business')) {
          const businessDays = Math.min(tripDays, 5); // Assume max 5 business days
          items.push(
            { name: 'Business Suits', category: 'Business Attire', quantity: Math.ceil(businessDays / 2) },
            { name: 'Dress Shirts', category: 'Business Attire', quantity: businessDays },
            { name: 'Dress Pants', category: 'Business Attire', quantity: Math.ceil(businessDays / 2) },
            { name: 'Dress Shoes', category: 'Footwear', quantity: 1 },
            { name: 'Professional Accessories', category: 'Business Items', quantity: 1 }
          );

          if (tripDays > 3) {
            items.push(
              { name: 'Portable Steamer', category: 'Business Items', quantity: 1 }
            );
          }
        }

        if (lowercaseActivity.includes('golf')) {
          const golfDays = Math.ceil(tripDays / 3);
          items.push(
            { name: 'Golf Polo Shirts', category: 'Athletic Wear', quantity: golfDays },
            { name: 'Golf Pants/Shorts', category: 'Athletic Wear', quantity: Math.ceil(golfDays / 2) },
            { name: 'Golf Shoes', category: 'Footwear', quantity: 1 },
            { name: 'Golf Glove', category: 'Equipment', quantity: 1 }
          );

          if (weather.isHot) {
            items.push(
              { name: 'Golf Hat/Visor', category: 'Accessories', quantity: 1 },
              { name: 'Golf Towel', category: 'Equipment', quantity: 1 }
            );
          }
        }
      });
    };

    // Essential items based on trip duration
    items.push(
      { name: 'Passport/ID', category: 'Documents & Money', quantity: 1 },
      { name: 'Phone + Charger', category: 'Electronics', quantity: 1 },
      { name: 'Toiletry Basics', category: 'Toiletries', quantity: 1 }
    );

    // Add weather-appropriate clothing
    addClothingItems();

    // Add activity-specific items
    addActivityItems();

    // Weather-specific additions
    if (weather.hasRain) {
      items.push(
        { name: 'Umbrella', category: 'Accessories', quantity: 1 },
        { name: 'Rain Jacket', category: 'Clothing', quantity: 1 }
      );
    }

    if (tripDays > 7) {
      items.push(
        { name: 'Laundry Bag', category: 'Accessories', quantity: 1 },
        { name: 'Travel Detergent', category: 'Toiletries', quantity: 1 }
      );
    }

    // Remove duplicates and optimize quantities
    const itemMap = new Map<string, PackingItem>();
    items.forEach(item => {
      const key = `${item.name}-${item.category}`;
      if (itemMap.has(key)) {
        const existingItem = itemMap.get(key)!;
        existingItem.quantity = Math.max(existingItem.quantity, item.quantity);
      } else {
        itemMap.set(key, { ...item });
      }
    });

    setPackingList(Array.from(itemMap.values()));
  };

  // Add reset function
  const handleReset = (): void => {
    setDestination('');
    setStartDate('');
    setEndDate('');
    setActivities([]);
    setWeatherData(null);
    setPackingList([]);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="px-6 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">PackAI - Smart Travel Packing</h1>
          <p className="text-blue-100 mt-1">Let AI plan your perfect packing list</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-8 hidden sm:block">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: 'Trip Details', icon: MapPin },
              { step: 2, title: 'Activities', icon: Activity },
              { step: 3, title: 'Weather', icon: Thermometer },
              { step: 4, title: 'Packing List', icon: Luggage }
            ].map(({ step, title, icon: Icon }) => (
              <div key={step} className="flex-1 relative">
                <div className={`flex flex-col items-center ${currentStep >= step ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep === step ? 'bg-blue-600 text-white' :
                    currentStep > step ? 'bg-green-500 text-white' : 'bg-gray-200'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <span className="mt-2 text-sm font-medium">{title}</span>
                </div>
                {step < 4 && (
                  <div className={`absolute top-5 left-1/2 w-full h-0.5 ${
                    currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-500 transform hover:shadow-xl">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <MapPin className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold">Trip Details</h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Where are you heading?</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter city or country"
                      value={destination}
                      onChange={handleDestinationChange}
                      onFocus={() => destination.length >= 2 && setShowSuggestions(true)}
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  </div>

                  {showSuggestions && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                    >
                      {suggestions.length > 0 ? (
                        suggestions.map((city, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                            onClick={() => selectSuggestion(city)}
                          >
                            <div className="flex items-center space-x-2">
                              <MapPin size={16} className="text-gray-400" />
                              <span>{city}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-gray-500 text-center">
                          {searchLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                              <span>Searching...</span>
                            </div>
                          ) : 'No suggestions'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleNextStep}
                  disabled={!destination || !startDate || !endDate}
                >
                  <span>Continue to Activities</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="text-blue-600" size={24} />
                  <h2 className="text-xl font-semibold">Planned Activities</h2>
                </div>
                <button
                  onClick={handleBackStep}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span>Back</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="What activities are you planning? (e.g., Beach day, Hiking)"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button
                    onClick={addActivity}
                    className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
                    disabled={!newActivity.trim()}
                  >
                    <Plus size={24} />
                  </button>
                </div>

                <div className="space-y-2">
                  {activities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
                    >
                      <span>{activity}</span>
                      <button
                        onClick={() => removeActivity(index)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {activities.length === 0 && (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <Activity size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">
                      Add activities to get personalized packing suggestions, or continue to skip.
                    </p>
                  </div>
                )}

                <button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center space-x-2"
                  onClick={handleNextStep}
                >
                  <span>{activities.length > 0 ? 'Continue to Weather' : 'Skip Activities'}</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && weatherData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Thermometer className="text-blue-600" size={24} />
                  <h2 className="text-xl font-semibold">Weather Forecast</h2>
                </div>
                <button
                  onClick={handleBackStep}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span>Back</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weatherData.map((day, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all hover:shadow-md"
                  >
                    <div className="font-medium text-lg text-blue-600">{day.date}</div>
                    <div className="mt-2 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-500">↑ {day.high}°F</span>
                        <span className="text-blue-500">↓ {day.low}°F</span>
                      </div>
                      <div className="mt-1 flex items-center space-x-2">
                        {day.conditions === 'Sunny' && '☀️'}
                        {day.conditions === 'Partly Cloudy' && '⛅'}
                        {day.conditions === 'Cloudy' && '☁️'}
                        {day.conditions === 'Light Rain' && '🌧️'}
                        <span>{day.conditions}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center space-x-2"
                onClick={handleNextStep}
              >
                <span>Generate Packing List</span>
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {currentStep === 4 && packingList.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Luggage className="text-blue-600" size={24} />
                  <h2 className="text-xl font-semibold">Your Packing List</h2>
                </div>
                <button
                  onClick={handleBackStep}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span>Back</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from(new Set(packingList.map(item => item.category))).map(category => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-medium text-lg text-gray-900 border-b border-gray-200 pb-2">{category}</h3>
                    <div className="space-y-2">
                      {packingList
                        .filter(item => item.category === category)
                        .map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
                          >
                            <span>{item.name}</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                              Qty: {item.quantity}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-6">
                <button
                  onClick={handleReset}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>Create New Packing List</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-8 text-center text-gray-500 pb-6">
        <p>Made with ❤️ by PackAI</p>
      </footer>
    </div>
  );
};

export default PackingApp;
