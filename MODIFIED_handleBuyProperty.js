const handleBuyProperty = async () => {
  if (!user) {
    toast({
      title: 'Error',
      description: 'You must be logged in to buy property',
      status: 'error',
      duration: 3000,
      isClosable: true,
    })
    return
  }

  const selectedCellArray = Array.from(selectedCells.current)
  if (selectedCellArray.length === 0) {
    toast({
      title: 'Error',
      description: 'Please select at least one cell to buy',
      status: 'error',
      duration: 3000,
      isClosable: true,
    })
    return
  }
  
  // Check if any cells are already owned
  const ownedCells = selectedCellArray.filter(cell => isCellAlreadyOwned(cell))
  if (ownedCells.length > 0) {
    toast({
      title: 'Error',
      description: `${ownedCells.length} of the selected cells are already owned and cannot be purchased`,
      status: 'error',
      duration: 3000,
      isClosable: true,
    })
    return
  }

  // Check for user profile with the new API
  try {
    setIsLoading(true)
    
    // Ensure we have the latest users data
    await fetchUsers()
    
    // Check if user profile exists in the current data
    let userProfile = usersRef.current[user.uid]
    
    if (!userProfile) {
      console.log('User profile not found, checking API directly...')
      
      const response = await fetch(`${API_URL}/users/profile`, {
        headers: {
          'Firebase-UID': user.uid
        }
      })
      
      if (!response.ok) {
        if (response.status === 404 || response.status === 401) {
          console.log('Creating new user profile...')
          // Create user if not found
          const createResponse = await fetch(`${API_URL}/users/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email || 'unknown@example.com',
              name: user.displayName || 'User'
            })
          })
          
          if (!createResponse.ok) {
            throw new Error('Failed to create user profile')
          }
          
          // Fetch the newly created user directly from API
          const newUserResponse = await fetch(`${API_URL}/users/profile`, {
            headers: {
              'Firebase-UID': user.uid
            }
          })
          
          if (!newUserResponse.ok) {
            throw new Error('Failed to fetch newly created user profile')
          }
          
          userProfile = await newUserResponse.json()
          
          // Also update global users data
          await fetchUsers()
        } else {
          throw new Error('Failed to retrieve user profile')
        }
      } else {
        // User exists in API but not in our local state
        userProfile = await response.json()
        await fetchUsers()
      }
    }
    
    // Now check if we have a valid user profile
    if (!userProfile) {
      throw new Error('User profile not found after creation')
    }
    
    console.log('Working with user profile:', userProfile)
    
    // At this point we should have a valid user profile
    const totalCost = selectedCellArray.length * propertyPrice
    if (userProfile.tokens < totalCost) {
      toast({
        title: 'Error',
        description: `Insufficient tokens. You need ${totalCost} tokens to buy this property`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }
    
    // Create a new property with a unique ID
    const propertyId = uuidv4()
    
    // Create a property object with all required fields
    const propertyData = {
      id: propertyId,
      owner: user.uid,
      cells: selectedCellArray,
      price: totalCost,
      // Add these required fields as per the property model
      name: `Property #${Date.now().toString().slice(-4)}`,
      description: `Property with ${selectedCellArray.length} cells`,
      address: 'Grid Map Location',
      forSale: false,
      salePrice: totalCost * 1.5 // Default sale price if user wants to sell later
    }
    
    console.log('Buying property with data:', propertyData)
    
    // Deduct tokens for purchase
    await deductToken(user.uid, totalCost)
    
    // Save property to user's properties using the API endpoint
    const propertyResponse = await fetch(`${API_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Firebase-UID': user.uid
      },
      body: JSON.stringify(propertyData)
    })
    
    if (!propertyResponse.ok) {
      // Get detailed error from response
      const errorData = await propertyResponse.json()
      console.error('Property creation error:', errorData)
      throw new Error(`Failed to create property: ${errorData.message || 'Unknown error'}`)
    }
    
    const propertyResult = await propertyResponse.json()
    console.log('Property created successfully:', propertyResult)
    
    toast({
      title: 'Success',
      description: `Property purchased successfully for ${totalCost} tokens`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
    
    // Clear selection after purchase
    selectedCells.current.clear()
    isSelectionMode.current = false
    updateSelection()
    
    // Reload properties on the map
    await fetchUsers()
    
    // Force property reload with a small delay
    setTimeout(() => {
      refreshPropertyDisplay()
    }, 500)

    // Fly to newly purchased property after a short delay
    setTimeout(() => {
      console.log('Flying to newly purchased property')
      flyToProperty(propertyId)
    }, 1000)
  } catch (error) {
    console.error('Buy property error:', error)
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to purchase property',
      status: 'error',
      duration: 3000,
      isClosable: true,
    })
  } finally {
    setIsLoading(false)
  }
} 