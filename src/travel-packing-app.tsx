import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, X, MapPin, Thermometer, Clock, Activity, Luggage, Search } from 'lucide-react';

const PackingApp = () => {
  // App states
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [weatherData, setWeatherData] = useState(null);
  const [packingList, setPackingList] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Ref for the suggestions dropdown
  const suggestionsRef = useRef(null);

  // Search cities using Mapbox Geocoding API with CORS handling
  const searchCities = async (query) => {
    if (query.length < 2) return [];
    
    try {
      const MAPBOX_API_KEY = 'pk.eyJ1IjoiYmJyYmJhMTMiLCJhIjoiY203bzBqNThyMDZ4cjJzb2hicGpteWtzbyJ9.17_6m0uEnSO2eNeCD8d1bg';
      
      // Use a specific endpoint with json format explicitly stated
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_API_KEY}&types=place&limit=10`;
      
      console.log('Searching for:', query);
      console.log('Using API URL:', geocodingUrl);
      
      // Make the API request with specific headers and cache control
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
      
      const data = await response.json();
      console.log('API response received:', data);
      
      if (data && data.features && data.features.length > 0) {
        console.log(`Found ${data.features.length} cities`);
        
        return data.features.map(feature => {
          // Use the place_name property which is already formatted nicely
          return feature.place_name;
        });
      }
      
      console.log('No results from API');
      return [];
      
    } catch (error) {
      console.error('API error details:', error);
      return [];
    }
  };
  
  // Handle destination input change
  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setDestination(value);
    
    if (value.length >= 2) {
      setShowSuggestions(true);
      setSearchLoading(true);
      
      // Debounce API calls
      clearTimeout(window.searchTimeout);
      window.searchTimeout = setTimeout(async () => {
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

  // Handle suggestion selection
  const selectSuggestion = (city) => {
    setDestination(city);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mock weather data generation
  const generateWeatherData = () => {
    // In a real app, this would call a weather API
    setIsGenerating(true);
    setTimeout(() => {
      const days = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
      const mockWeather = Array(days).fill().map((_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return {
          date: date.toLocaleDateString(),
          high: Math.floor(Math.random() * 15) + 65, // 65-80°F
          low: Math.floor(Math.random() * 15) + 45,  // 45-60°F
          conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)]
        };
      });
      setWeatherData(mockWeather);
      setIsGenerating(false);
      setCurrentStep(3);
    }, 1500);
  };

  // Add a new activity
  const addActivity = () => {
    if (newActivity.trim() !== '') {
      setActivities([...activities, newActivity]);
      setNewActivity('');
    }
  };

  // Remove an activity
  const removeActivity = (index) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  // Calculate trip duration
  const getTripDuration = () => {
    if (!startDate || !endDate) return '';
    const days = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Next step handler
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (destination && startDate && endDate) {
        setCurrentStep(2);
      } else {
        alert("Please fill in all fields");
      }
    } else if (currentStep === 2) {
      generateWeatherData();
    } else if (currentStep === 3) {
      generatePackingList();
    }
  };

  // Back step handler
  const handleBackStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Mock packing list generation with expanded activity-specific items
  const generatePackingList = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Base items everyone needs
      const baseItems = [
        { name: 'Passport/ID', category: 'Essentials' },
        { name: 'Phone charger', category: 'Essentials' },
        { name: 'Wallet/Money', category: 'Essentials' },
        { name: 'Travel insurance info', category: 'Essentials' },
        { name: 'Medications', category: 'Essentials' },
        { name: 'Toothbrush', category: 'Toiletries' },
        { name: 'Toothpaste', category: 'Toiletries' },
        { name: 'Deodorant', category: 'Toiletries' },
        { name: 'Shampoo/Conditioner', category: 'Toiletries' },
        { name: 'Body wash/Soap', category: 'Toiletries' },
        { name: 'Face wash', category: 'Toiletries' },
        { name: 'Moisturizer', category: 'Toiletries' },
        { name: 'Razor/Shaving cream', category: 'Toiletries' },
        { name: 'Underwear', category: 'Clothing' },
        { name: 'Socks', category: 'Clothing' },
        { name: 'T-shirts', category: 'Clothing' },
        { name: 'Pajamas', category: 'Clothing' }
      ];

      // Weather-based recommendations
      const weatherItems = [];
      if (weatherData) {
        const avgHigh = weatherData.reduce((sum, day) => sum + day.high, 0) / weatherData.length;
        const avgLow = weatherData.reduce((sum, day) => sum + day.low, 0) / weatherData.length;
        const hasRain = weatherData.some(day => day.conditions.includes('Rain'));
        
        if (avgHigh > 80) {
          weatherItems.push(
            { name: 'Shorts', category: 'Clothing' },
            { name: 'Tank tops', category: 'Clothing' },
            { name: 'Sandals', category: 'Footwear' },
            { name: 'Sunglasses', category: 'Accessories' },
            { name: 'Sunscreen', category: 'Toiletries' },
            { name: 'Hat/Cap', category: 'Accessories' },
            { name: 'Light, breathable clothing', category: 'Clothing' }
          );
        } else if (avgHigh > 70) {
          weatherItems.push(
            { name: 'Shorts', category: 'Clothing' },
            { name: 'T-shirts', category: 'Clothing' },
            { name: 'Light jacket', category: 'Clothing' },
            { name: 'Sunglasses', category: 'Accessories' },
            { name: 'Sunscreen', category: 'Toiletries' }
          );
        } else if (avgHigh > 60) {
          weatherItems.push(
            { name: 'Light sweater', category: 'Clothing' },
            { name: 'Long pants', category: 'Clothing' },
            { name: 'Light jacket', category: 'Clothing' }
          );
        } else if (avgHigh > 40) {
          weatherItems.push(
            { name: 'Sweater', category: 'Clothing' },
            { name: 'Medium jacket', category: 'Clothing' },
            { name: 'Long pants', category: 'Clothing' },
            { name: 'Closed-toe shoes', category: 'Footwear' }
          );
        } else {
          weatherItems.push(
            { name: 'Heavy sweater', category: 'Clothing' },
            { name: 'Winter coat', category: 'Clothing' },
            { name: 'Thermal underwear', category: 'Clothing' },
            { name: 'Wool socks', category: 'Clothing' },
            { name: 'Gloves', category: 'Accessories' },
            { name: 'Scarf', category: 'Accessories' },
            { name: 'Winter hat', category: 'Accessories' },
            { name: 'Winter boots', category: 'Footwear' }
          );
        }
        
        if (avgLow < 35) {
          weatherItems.push(
            { name: 'Heavy coat', category: 'Clothing' },
            { name: 'Thermal layers', category: 'Clothing' },
            { name: 'Warm hat', category: 'Accessories' },
            { name: 'Insulated gloves', category: 'Accessories' }
          );
        }
        
        if (hasRain) {
          weatherItems.push(
            { name: 'Umbrella', category: 'Accessories' },
            { name: 'Rain jacket', category: 'Clothing' },
            { name: 'Waterproof shoes', category: 'Footwear' }
          );
        }
      }

      // Activity-based recommendations
      const activityItems = [];
      
      // Process each activity
      activities.forEach(activity => {
        const activityLower = activity.toLowerCase();
        
        // Golf
        if (activityLower.includes('golf')) {
          activityItems.push(
            { name: 'Golf shoes', category: 'Sports Gear' },
            { name: 'Golf socks', category: 'Sports Gear' },
            { name: 'Golf glove', category: 'Sports Gear' },
            { name: 'Golf shirt/polo', category: 'Sports Gear' },
            { name: 'Golf hat/visor', category: 'Sports Gear' },
            { name: 'Golf pants/shorts', category: 'Sports Gear' },
            { name: 'Golf clubs (or rental info)', category: 'Sports Gear' },
            { name: 'Sunscreen', category: 'Toiletries' }
          );
        }
        
        // Hiking
        if (activityLower.includes('hik') || activityLower.includes('trek')) {
          activityItems.push(
            { name: 'Hiking boots/shoes', category: 'Sports Gear' },
            { name: 'Hiking socks', category: 'Sports Gear' },
            { name: 'Quick-dry pants/shorts', category: 'Sports Gear' },
            { name: 'Moisture-wicking shirts', category: 'Sports Gear' },
            { name: 'Hiking backpack', category: 'Sports Gear' },
            { name: 'Water bottle', category: 'Sports Gear' },
            { name: 'First aid kit', category: 'Sports Gear' },
            { name: 'Sunscreen', category: 'Toiletries' }
          );
        }
        
        // Beach/Swimming
        if (activityLower.includes('beach') || activityLower.includes('swim')) {
          activityItems.push(
            { name: 'Swimsuit', category: 'Clothing' },
            { name: 'Beach towel', category: 'Accessories' },
            { name: 'Flip flops/sandals', category: 'Footwear' },
            { name: 'Sunscreen (SPF 30+)', category: 'Toiletries' },
            { name: 'Sunglasses', category: 'Accessories' }
          );
        }
        
        // Formal Dinner
        if (activityLower.includes('dinner') || activityLower.includes('formal')) {
          activityItems.push(
            { name: 'Formal outfit', category: 'Formal Wear' },
            { name: 'Dress shoes', category: 'Formal Wear' },
            { name: 'Dress/Evening wear', category: 'Formal Wear' },
            { name: 'Cologne/Perfume', category: 'Toiletries' }
          );
        }
        
        // Business Meeting
        if (activityLower.includes('business') || activityLower.includes('meeting')) {
          activityItems.push(
            { name: 'Business suit/outfit', category: 'Business Attire' },
            { name: 'Dress shoes', category: 'Business Attire' },
            { name: 'Laptop', category: 'Electronics' },
            { name: 'Notebook/Planner', category: 'Business Essentials' },
            { name: 'Business cards', category: 'Business Essentials' }
          );
        }
      });

      // Duration-based quantity suggestions
      const days = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
      
      // Combine all items (removing duplicates by name)
      const allItems = [...baseItems, ...weatherItems, ...activityItems];
      const uniqueItems = [];
      const itemNames = new Set();
      
      allItems.forEach(item => {
        if (!itemNames.has(item.name)) {
          itemNames.add(item.name);
          uniqueItems.push(item);
        }
      });
      
      // Add quantities for clothing items
      const finalList = uniqueItems.map(item => {
        if (item.name === 'Underwear' || item.name === 'Socks') {
          return { ...item, quantity: days + 1 }; // +1 extra
        }
        if (item.category === 'Clothing' && (item.name.includes('shirt') || item.name.includes('T-shirt'))) {
          return { ...item, quantity: Math.ceil(days / 2) };
        }
        return { ...item, quantity: 1 };
      });
      
      setPackingList(finalList);
      setIsGenerating(false);
      setCurrentStep(4);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="px-4 py-4 bg-blue-600 text-white">
        <h1 className="text-xl font-bold">PackAI - Smart Travel Packing</h1>
      </header>
      
      {/* Main content */}
      <main className="flex-1 p-4 overflow-auto">
        {/* Step 1: Trip Details */}
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
                
                {/* Suggestions dropdown */}
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
                          on
