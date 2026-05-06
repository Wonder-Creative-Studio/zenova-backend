export const normalizeLocation = (input) => {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  let longitude, latitude;

  // Case 1: Direct latitude/longitude fields (supporting variations)
  const lat = input.latitude !== undefined ? input.latitude : input.lat;
  const lng = input.longitude !== undefined ? input.longitude : (input.lng !== undefined ? input.lng : input.long);

  if (lat !== undefined && lng !== undefined) {
    longitude = Number(lng);
    latitude = Number(lat);
  }
  // Case 2: GeoJSON object { type: 'Point', coordinates: [lng, lat] }
  else if (Array.isArray(input.coordinates) && input.coordinates.length === 2) {
    [longitude, latitude] = input.coordinates.map(Number);
  }
  // Case 3: Nested location object
  else if (input.location && typeof input.location === 'object') {
    return normalizeLocation(input.location);
  }

  if (longitude === undefined || latitude === undefined || 
      !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
};

export default {
  normalizeLocation,
};
