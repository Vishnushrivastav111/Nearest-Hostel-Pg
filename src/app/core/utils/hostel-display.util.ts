export function hostelTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case 'boys':
      return 'Boys PG';
    case 'girls':
      return 'Girls PG';
    case 'co-living':
      return 'Co-living';
    case 'other':
      return 'PG';
    default:
      return type ? type : 'PG';
  }
}

export function sharingLabel(type: string | null | undefined): string {
  switch (type) {
    case 'single':
      return 'Single sharing';
    case 'double':
      return 'Double sharing';
    case 'triple':
      return 'Triple sharing';
    case 'four':
      return 'Four sharing';
    default:
      return type ? `${type} sharing` : 'Sharing';
  }
}

export function facilityKind(name: string): 'wifi' | 'food' | 'laundry' | 'parking' | 'ac' | 'other' {
  const value = name.toLowerCase();
  if (value.includes('wifi') || value.includes('wi-fi') || value.includes('internet')) {
    return 'wifi';
  }
  if (value.includes('food') || value.includes('meal') || value.includes('mess')) {
    return 'food';
  }
  if (value.includes('laundry') || value.includes('wash')) {
    return 'laundry';
  }
  if (value.includes('park')) {
    return 'parking';
  }
  if (value.includes('ac') || value.includes('air')) {
    return 'ac';
  }
  return 'other';
}
