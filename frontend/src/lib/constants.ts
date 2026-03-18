export const TOC_NAMES: Record<string, string> = {
  '05': 'CrossCountry',
  '06': 'Chiltern Railways',
  '08': 'Merseyrail',
  '09': 'East Midlands Railway',
  '19': 'Heathrow Connect',
  '20': 'TransPennine Express',
  '21': 'Avanti West Coast',
  '22': 'Alliance Rail',
  '23': 'Transport for Wales',
  '25': 'Southeastern',
  '27': 'London Northwestern',
  '28': 'Greater Anglia',
  '29': 'Thameslink',
  '30': 'Gatwick Express',
  '33': 'Heathrow Express',
  '34': 'Lumo',
  '35': 'Grand Central',
  '39': 'Chiltern Railways',
  '40': 'CrossCountry',
  '42': 'Southern',
  '45': 'Gatwick Express',
  '46': 'Eurostar',
  '49': 'Caledonian Sleeper',
  '54': 'South Western Railway',
  '56': 'GB Railfreight',
  '60': 'Great Western Railway',
  '61': 'ScotRail',
  '64': 'Island Line',
  '65': 'Northern',
  '71': 'Network Rail',
  '74': 'DB Cargo UK',
  '79': 'Freightliner',
  '80': 'DB Cargo UK',
  '84': 'GB Railfreight',
  '85': 'Freightliner Heavy Haul',
  '86': 'Direct Rail Services',
  '88': 'London Overground',
  '91': 'Eurostar',
  '93': 'GB Railfreight',
  '97': 'Network Rail (Test)',
};

export function tocName(id: string): string {
  return TOC_NAMES[id] ?? `TOC ${id}`;
}

export function tocLabel(id: string): string {
  return TOC_NAMES[id] ? `${TOC_NAMES[id]} (${id})` : `TOC ${id}`;
}

export const MSG_TYPE_COLORS: Record<string, string> = {
  Movement: '#3b82f6',
  Activation: '#22c55e',
  Cancellation: '#ef4444',
  Reinstatement: '#a855f7',
  'Change of Origin': '#f97316',
  'Change of Identity': '#06b6d4',
  'Change of Location': '#eab308',
};

export const VAR_COLORS = {
  'ON TIME': '#22c55e',
  EARLY: '#06b6d4',
  LATE: '#ef4444',
  'OFF ROUTE': '#f97316',
} as const;
