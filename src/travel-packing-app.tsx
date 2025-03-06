import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Activity, Plus, X, Thermometer, Luggage } from 'lucide-react';

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
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Ref for the suggestions dropdown and timeout
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Helper function to handle date timezone issues
  const getLocalDate = (dateString: string): Date => {
    const date = new Date(dateString);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  };

  // Search cities using Mapbox Geocoding API
  const searchCities = async (query: string): Promise<string[]> => {
    if (query.length < 2) return [];

    try {
      const MAPBOX_API_KEY = process.env.REACT_APP_MAPBOX_API_KEY;
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_API_KEY}&types=place&limit=10`;

      const response = await fetch(geocodingUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        redirect: 'follow',
        referrerPolicy: 'no-referrer'
      });

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
      return [];
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
    } else if (currentStep === 2 && activities.length > 0) {
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

  // Generate mock weather data
  const generateWeatherData = (): void => {
    setIsGenerating(true);
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
        conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)]
      };
    });
    setWeatherData(mockWeather);
    setIsGenerating(false);
  };

  // Generate packing list based on weather and activities
  const generatePackingList = (): void => {
    setIsGenerating(true);
    
    // Calculate trip duration
    const start = getLocalDate(startDate);
    const end = getLocalDate(endDate);
    const tripDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const baseItems: PackingItem[] = [
      // Essential Documents & Money
      { name: 'Passport/ID', category: 'Documents & Money', quantity: 1 },
      { name: 'Credit/Debit Cards', category: 'Documents & Money', quantity: 1 },
      { name: 'Travel Insurance Documents', category: 'Documents & Money', quantity: 1 },
      
      // Electronics
      { name: 'Phone + Charger', category: 'Electronics', quantity: 1 },
      { name: 'Power Bank', category: 'Electronics', quantity: 1 },
      { name: 'Universal Power Adapter', category: 'Electronics', quantity: 1 },
      
      // Basic Clothing (based on trip duration)
      { name: 'Underwear', category: 'Clothing', quantity: tripDays + 1 }, // Extra day just in case
      { name: 'Socks', category: 'Clothing', quantity: tripDays + 1 },
      { name: 'T-shirts/Casual tops', category: 'Clothing', quantity: Math.ceil(tripDays / 2) },
      { name: 'Pants/Shorts', category: 'Clothing', quantity: Math.ceil(tripDays / 3) },
      
      // Toiletries
      { name: 'Toothbrush', category: 'Toiletries', quantity: 1 },
      { name: 'Toothpaste', category: 'Toiletries', quantity: 1 },
      { name: 'Deodorant', category: 'Toiletries', quantity: 1 },
      { name: 'Shampoo/Conditioner', category: 'Toiletries', quantity: 1 },
      { name: 'Body Wash', category: 'Toiletries', quantity: 1 },
      { name: 'Hair Brush/Comb', category: 'Toiletries', quantity: 1 },
      { name: 'Medications', category: 'Toiletries', quantity: 1 },
      
      // Miscellaneous
      { name: 'Water Bottle', category: 'Miscellaneous', quantity: 1 },
      { name: 'Day Bag/Backpack', category: 'Miscellaneous', quantity: 1 }
    ];

    // Add weather-based items
    if (weatherData) {
      const avgHigh = weatherData.reduce((sum, day) => sum + day.high, 0) / weatherData.length;
      const avgLow = weatherData.reduce((sum, day) => sum + day.low, 0) / weatherData.length;
      const hasRain = weatherData.some(day => day.conditions.includes('Rain'));

      if (avgHigh > 75) {
        baseItems.push(
          { name: 'Sunscreen (SPF 30+)', category: 'Toiletries', quantity: 1 },
          { name: 'Sunglasses', category: 'Accessories', quantity: 1 },
          { name: 'Sun Hat', category: 'Accessories', quantity: 1 },
          { name: 'Shorts', category: 'Clothing', quantity: Math.ceil(tripDays / 2) },
          { name: 'Light T-shirts', category: 'Clothing', quantity: Math.ceil(tripDays / 2) },
          { name: 'Sandals', category: 'Footwear', quantity: 1 }
        );
      }
      
      if (avgLow < 60) {
        baseItems.push(
          { name: 'Warm Jacket', category: 'Clothing', quantity: 1 },
          { name: 'Sweaters/Hoodies', category: 'Clothing', quantity: 2 },
          { name: 'Long Sleeve Shirts', category: 'Clothing', quantity: Math.ceil(tripDays / 2) },
          { name: 'Thermal Underwear', category: 'Clothing', quantity: 1 },
          { name: 'Warm Socks', category: 'Clothing', quantity: Math.ceil(tripDays / 2) }
        );
      }

      if (avgLow < 40) {
        baseItems.push(
          { name: 'Winter Coat', category: 'Clothing', quantity: 1 },
          { name: 'Winter Gloves', category: 'Accessories', quantity: 1 },
          { name: 'Winter Hat/Beanie', category: 'Accessories', quantity: 1 },
          { name: 'Scarf', category: 'Accessories', quantity: 1 }
        );
      }

      if (hasRain) {
        baseItems.push(
          { name: 'Umbrella', category: 'Accessories', quantity: 1 },
          { name: 'Rain Jacket/Windbreaker', category: 'Clothing', quantity: 1 },
          { name: 'Waterproof Shoes', category: 'Footwear', quantity: 1 }
        );
      }
    }

    // Add activity-based items
    activities.forEach(activity => {
      const lowercaseActivity = activity.toLowerCase();
      
      if (lowercaseActivity.includes('beach') || lowercaseActivity.includes('swim')) {
        baseItems.push(
          { name: 'Swimsuit', category: 'Clothing', quantity: 2 }, // Backup swimsuit
          { name: 'Beach Towel', category: 'Accessories', quantity: 1 },
          { name: 'Beach Bag', category: 'Accessories', quantity: 1 },
          { name: 'Flip Flops', category: 'Footwear', quantity: 1 },
          { name: 'Beach Cover-up', category: 'Clothing', quantity: 1 },
          { name: 'Waterproof Phone Case', category: 'Accessories', quantity: 1 },
          { name: 'After-Sun Lotion', category: 'Toiletries', quantity: 1 }
        );
      }
      
      if (lowercaseActivity.includes('hik')) {
        baseItems.push(
          { name: 'Hiking Boots', category: 'Footwear', quantity: 1 },
          { name: 'Hiking Socks', category: 'Clothing', quantity: Math.ceil(tripDays / 2) },
          { name: 'Moisture-Wicking Shirts', category: 'Clothing', quantity: Math.ceil(tripDays / 2) },
          { name: 'Hiking Pants', category: 'Clothing', quantity: 2 },
          { name: 'First Aid Kit', category: 'Miscellaneous', quantity: 1 },
          { name: 'Insect Repellent', category: 'Toiletries', quantity: 1 },
          { name: 'Hiking Backpack', category: 'Accessories', quantity: 1 },
          { name: 'Trekking Poles', category: 'Equipment', quantity: 1 },
          { name: 'Trail Map/GPS Device', category: 'Equipment', quantity: 1 }
        );
      }
      
      if (lowercaseActivity.includes('business')) {
        baseItems.push(
          { name: 'Business Suits', category: 'Business Attire', quantity: Math.min(3, Math.ceil(tripDays / 2)) },
          { name: 'Dress Shirts', category: 'Business Attire', quantity: tripDays },
          { name: 'Dress Pants', category: 'Business Attire', quantity: Math.min(3, Math.ceil(tripDays / 2)) },
          { name: 'Sport Coat/Blazer', category: 'Business Attire', quantity: 1 },
          { name: 'Ties', category: 'Business Attire', quantity: Math.min(3, tripDays) },
          { name: 'Dress Shoes', category: 'Footwear', quantity: 1 },
          { name: 'Dress Socks', category: 'Business Attire', quantity: tripDays },
          { name: 'Belt', category: 'Accessories', quantity: 1 },
          { name: 'Business Cards', category: 'Business Items', quantity: 1 },
          { name: 'Laptop + Charger', category: 'Business Items', quantity: 1 },
          { name: 'Notebook + Pen', category: 'Business Items', quantity: 1 }
        );
      }

      if (lowercaseActivity.includes('gym') || lowercaseActivity.includes('workout')) {
        baseItems.push(
          { name: 'Workout Shirts', category: 'Athletic Wear', quantity: Math.ceil(tripDays / 2) },
          { name: 'Workout Shorts/Pants', category: 'Athletic Wear', quantity: Math.ceil(tripDays / 2) },
          { name: 'Athletic Socks', category: 'Athletic Wear', quantity: Math.ceil(tripDays / 2) },
          { name: 'Athletic Shoes', category: 'Footwear', quantity: 1 },
          { name: 'Gym Towel', category: 'Athletic Wear', quantity: 1 }
        );
      }
    });

    // Remove duplicates and combine quantities for same items
    const itemMap = new Map<string, PackingItem>();
    baseItems.forEach(item => {
      const key = `${item.name}-${item.category}`;
      if (itemMap.has(key)) {
        const existingItem = itemMap.get(key)!;
        existingItem.quantity = Math.max(existingItem.quantity, item.quantity);
      } else {
        itemMap.set(key, { ...item });
      }
    });

    setPackingList(Array.from(itemMap.values()));
    setIsGenerating(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="px-4 py-4 bg-blue-600 text-white">
        <h1 className="text-xl font-bold">PackAI - Smart Travel Packing</h1>
      </header>

      <main className="flex-1 p-4 overflow-auto">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center">
              <MapPin className="mr-2" size={20} />
              Trip Details
            </h2>

            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Destination</label>
                <div className="relative">
                  <input
                    type="text"
                    className="mt-1 block w-full p-2 pl-8 border border-gray-300 rounded-md"
                    placeholder="City, Country"
                    value={destination}
                    onChange={handleDestinationChange}
                    onFocus={() => destination.length >= 2 && setShowSuggestions(true)}
                  />
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>

                {showSuggestions && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    {suggestions.length > 0 ? (
                      suggestions.map((city, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-blue-50 cursor-pointer"
                          onClick={() => selectSuggestion(city)}
                        >
                          {city}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-gray-500">
                        {searchLoading ? 'Searching...' : 'No suggestions'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <button
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                onClick={handleNextStep}
                disabled={!destination || !startDate || !endDate}
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <Activity className="mr-2" size={20} />
                Planned Activities
              </h2>
              <button
                onClick={handleBackStep}
                className="text-blue-600 hover:text-blue-800"
              >
                Back
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  placeholder="Add an activity (e.g., Beach day, Hiking, Business meeting)"
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button
                  onClick={addActivity}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  disabled={!newActivity.trim()}
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200"
                  >
                    <span>{activity}</span>
                    <button
                      onClick={() => removeActivity(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {activities.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Add some activities to help us suggest what to pack!
                </p>
              )}

              <button
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 mt-4"
                onClick={handleNextStep}
                disabled={activities.length === 0}
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && weatherData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <Thermometer className="mr-2" size={20} />
                Weather Forecast
              </h2>
              <button
                onClick={handleBackStep}
                className="text-blue-600 hover:text-blue-800"
              >
                Back
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weatherData.map((day, index) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-lg border border-gray-200 space-y-2"
                >
                  <div className="font-medium">{day.date}</div>
                  <div className="text-sm text-gray-600">
                    High: {day.high}°F | Low: {day.low}°F
                  </div>
                  <div className="text-sm text-gray-600">{day.conditions}</div>
                </div>
              ))}
            </div>

            <button
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 mt-4"
              onClick={handleNextStep}
            >
              Generate Packing List
            </button>
          </div>
        )}

        {currentStep === 4 && packingList.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <Luggage className="mr-2" size={20} />
                Packing List
              </h2>
              <button
                onClick={handleBackStep}
                className="text-blue-600 hover:text-blue-800"
              >
                Back
              </button>
            </div>

            <div className="space-y-6">
              {Array.from(new Set(packingList.map(item => item.category))).map(category => (
                <div key={category} className="space-y-2">
                  <h3 className="font-medium text-gray-900">{category}</h3>
                  <div className="space-y-2">
                    {packingList
                      .filter(item => item.category === category)
                      .map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200"
                        >
                          <span>{item.name}</span>
                          <span className="text-gray-500">Qty: {item.quantity}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PackingApp;
