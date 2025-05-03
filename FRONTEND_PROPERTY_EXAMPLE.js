// Example code for creating a property with all required fields

// Property data structure in your frontend code
const propertyData = {
  id: 'unique-uuid',         // REQUIRED - unique identifier
  cells: [                   // REQUIRED - array of cell coordinates
    "-740111,577507", 
    "-740113,577510"
  ],
  price: 30,                 // REQUIRED - initial purchase price
  
  // The following fields have default values in the backend but can be provided
  name: 'My Property',       // Optional (defaults to 'Untitled Property')
  description: 'Description', // Optional (defaults to 'No description provided')
  address: 'Location',       // Optional (defaults to 'No address provided')
  forSale: false,            // Optional (defaults to false)
  salePrice: 0               // Optional (defaults to 0)
};

// Example API call to create a property
async function createProperty(propertyData) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('http://localhost:5001/api/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Firebase-UID': user.uid
      },
      body: JSON.stringify(propertyData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Property created:', data);
    return data;
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
}

// Usage in your component
const handleBuyProperty = async () => {
  // Collect selected cells
  const selectedCellArray = [...selectedCells];
  
  // Calculate cost
  const totalCost = selectedCellArray.length * propertyPrice;
  
  // Check user tokens
  if (userProfile.tokens < totalCost) {
    alert('Not enough tokens');
    return;
  }
  
  // Create property data with all required fields
  const propertyData = {
    id: uuidv4(), // Generate unique ID
    cells: selectedCellArray,
    price: totalCost,
    name: `Property #${Date.now().toString().slice(-4)}`, // Add a name
    description: `Property containing ${selectedCellArray.length} cells`,
    address: 'Grid Map Location'
  };
  
  try {
    // Deduct tokens (handle this separately based on your API)
    await deductTokens(user.uid, totalCost);
    
    // Create the property
    const result = await createProperty(propertyData);
    
    // Handle success
    console.log('Property purchased successfully:', result);
    
    // Clear selection and update UI
    clearSelection();
    refreshMap();
  } catch (error) {
    console.error('Failed to purchase property:', error);
    // Handle error and possibly refund tokens
  }
}; 