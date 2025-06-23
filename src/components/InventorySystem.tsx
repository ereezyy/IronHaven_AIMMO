import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';
import { Package, ShoppingCart, Wrench, DollarSign, X } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  value: number;
  quantity: number;
  description: string;
  stats?: {
    damage?: number;
    protection?: number;
    healing?: number;
  };
}

interface ShopItem extends InventoryItem {
  price: number;
  unlockLevel: number;
}

const InventorySystem: React.FC = () => {
  const gameStore = useGameStore();
  const [showInventory, setShowInventory] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const shopItems: ShopItem[] = [
    {
      id: 'body_armor',
      name: 'Body Armor',
      type: 'armor',
      value: 500,
      price: 2000,
      quantity: 1,
      unlockLevel: 20,
      description: 'Military-grade body armor. Reduces incoming damage by 50%.',
      stats: { protection: 50 }
    },
    {
      id: 'health_kit',
      name: 'Health Kit',
      type: 'consumable',
      value: 100,
      price: 300,
      quantity: 1,
      unlockLevel: 0,
      description: 'Restores 50 health points instantly.',
      stats: { healing: 50 }
    },
    {
      id: 'ammo_pack',
      name: 'Ammo Pack',
      type: 'misc',
      value: 50,
      price: 150,
      quantity: 1,
      unlockLevel: 10,
      description: 'Refills ammunition for all weapons.'
    },
    {
      id: 'silencer',
      name: 'Weapon Silencer',
      type: 'misc',
      value: 800,
      price: 3000,
      quantity: 1,
      unlockLevel: 40,
      description: 'Reduces noise when firing weapons. Lower police detection.'
    },
    {
      id: 'lockpick_set',
      name: 'Lockpick Set',
      type: 'misc',
      value: 200,
      price: 500,
      quantity: 1,
      unlockLevel: 15,
      description: 'Allows access to locked vehicles and buildings.'
    }
  ];

  // Initialize inventory with some basic items
  useEffect(() => {
    setInventory([
      {
        id: 'basic_clothes',
        name: 'Street Clothes',
        type: 'misc',
        value: 50,
        quantity: 1,
        description: 'Basic street clothing.'
      }
    ]);
  }, []);

  const buyItem = (item: ShopItem) => {
    if (gameStore.playerStats.money >= item.price && gameStore.playerStats.reputation >= item.unlockLevel) {
      gameStore.updateStats({ money: gameStore.playerStats.money - item.price });
      
      const existingItem = inventory.find(inv => inv.id === item.id);
      if (existingItem) {
        setInventory(prev => prev.map(inv => 
          inv.id === item.id 
            ? { ...inv, quantity: inv.quantity + 1 }
            : inv
        ));
      } else {
        setInventory(prev => [...prev, { ...item, price: undefined, unlockLevel: undefined } as InventoryItem]);
      }
      
      gameStore.addAction(`bought_${item.id}`);
    }
  };

  const sellItem = (item: InventoryItem) => {
    const sellPrice = Math.floor(item.value * 0.6); // Sell for 60% of value
    gameStore.updateStats({ money: gameStore.playerStats.money + sellPrice });
    
    if (item.quantity > 1) {
      setInventory(prev => prev.map(inv => 
        inv.id === item.id 
          ? { ...inv, quantity: inv.quantity - 1 }
          : inv
      ));
    } else {
      setInventory(prev => prev.filter(inv => inv.id !== item.id));
    }
    
    gameStore.addAction(`sold_${item.id}`);
  };

  const useItem = (item: InventoryItem) => {
    if (item.type === 'consumable') {
      if (item.stats?.healing) {
        const newHealth = Math.min(gameStore.playerStats.health + item.stats.healing, 100);
        gameStore.updateStats({ health: newHealth });
      }
      
      // Remove one from inventory
      if (item.quantity > 1) {
        setInventory(prev => prev.map(inv => 
          inv.id === item.id 
            ? { ...inv, quantity: inv.quantity - 1 }
            : inv
        ));
      } else {
        setInventory(prev => prev.filter(inv => inv.id !== item.id));
      }
      
      gameStore.addAction(`used_${item.id}`);
    }
  };

  const getTypeColor = (type: InventoryItem['type']) => {
    switch (type) {
      case 'weapon': return 'text-red-400';
      case 'armor': return 'text-blue-400';
      case 'consumable': return 'text-green-400';
      case 'misc': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  const getTypeIcon = (type: InventoryItem['type']) => {
    switch (type) {
      case 'weapon': return '⚔️';
      case 'armor': return '🛡️';
      case 'consumable': return '💊';
      case 'misc': return '📦';
      default: return '❓';
    }
  };

  return (
    <>
      {/* Inventory Toggle Button */}
      <button
        onClick={() => setShowInventory(!showInventory)}
        className="absolute top-32 left-4 p-3 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm hover:bg-red-600/20 transition-colors"
      >
        <Package className="h-6 w-6" />
      </button>

      {/* Shop Toggle Button */}
      <button
        onClick={() => setShowShop(!showShop)}
        className="absolute top-20 left-4 p-3 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm hover:bg-red-600/20 transition-colors"
      >
        <ShoppingCart className="h-6 w-6" />
      </button>

      {/* Inventory Panel */}
      {showInventory && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-lg border border-red-500/70 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-400 flex items-center">
                <Package className="h-6 w-6 mr-2" />
                INVENTORY
              </h2>
              <button
                onClick={() => setShowInventory(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Your inventory is empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map(item => (
                  <div key={item.id} className="bg-zinc-800 p-4 rounded border border-zinc-700 hover:border-red-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-white flex items-center">
                        <span className="text-xl mr-2">{getTypeIcon(item.type)}</span>
                        {item.name}
                      </h3>
                      {item.quantity > 1 && (
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                    
                    <div className="space-y-1 text-xs mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className={getTypeColor(item.type)}>{item.type.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Value:</span>
                        <span className="text-green-400">${item.value}</span>
                      </div>
                      {item.stats && (
                        <>
                          {item.stats.damage && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Damage:</span>
                              <span className="text-red-400">+{item.stats.damage}</span>
                            </div>
                          )}
                          {item.stats.protection && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Protection:</span>
                              <span className="text-blue-400">+{item.stats.protection}%</span>
                            </div>
                          )}
                          {item.stats.healing && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Healing:</span>
                              <span className="text-green-400">+{item.stats.healing} HP</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {item.type === 'consumable' && (
                        <button
                          onClick={() => useItem(item)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm"
                        >
                          USE
                        </button>
                      )}
                      <button
                        onClick={() => sellItem(item)}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded text-sm"
                      >
                        SELL ${Math.floor(item.value * 0.6)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shop Panel */}
      {showShop && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-lg border border-red-500/70 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-400 flex items-center">
                <ShoppingCart className="h-6 w-6 mr-2" />
                BLACK MARKET
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-green-400 font-bold">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  {gameStore.playerStats.money.toLocaleString()}
                </span>
                <button
                  onClick={() => setShowShop(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopItems.map(item => {
                const canAfford = gameStore.playerStats.money >= item.price;
                const hasAccess = gameStore.playerStats.reputation >= item.unlockLevel;
                const canBuy = canAfford && hasAccess;

                return (
                  <div key={item.id} className={`bg-zinc-800 p-4 rounded border transition-colors ${
                    canBuy ? 'border-zinc-700 hover:border-red-500/50' : 'border-red-900/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-white flex items-center">
                        <span className="text-xl mr-2">{getTypeIcon(item.type)}</span>
                        {item.name}
                      </h3>
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                        ${item.price}
                      </span>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                    
                    <div className="space-y-1 text-xs mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className={getTypeColor(item.type)}>{item.type.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Unlock Level:</span>
                        <span className={hasAccess ? 'text-green-400' : 'text-red-400'}>
                          {item.unlockLevel} REP
                        </span>
                      </div>
                      {item.stats && (
                        <>
                          {item.stats.damage && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Damage:</span>
                              <span className="text-red-400">+{item.stats.damage}</span>
                            </div>
                          )}
                          {item.stats.protection && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Protection:</span>
                              <span className="text-blue-400">+{item.stats.protection}%</span>
                            </div>
                          )}
                          {item.stats.healing && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Healing:</span>
                              <span className="text-green-400">+{item.stats.healing} HP</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => buyItem(item)}
                      disabled={!canBuy}
                      className={`w-full py-2 px-4 rounded text-sm font-medium transition-colors ${
                        canBuy
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {!hasAccess ? 'LOCKED' : !canAfford ? 'INSUFFICIENT FUNDS' : 'BUY'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventorySystem;