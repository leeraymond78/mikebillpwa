/** Operating-period code → human-readable description (iOS `ParkingMeterProperties`). */
export function operatingPeriodDescription(operatingPeriod: string | null | undefined): string {
  switch (operatingPeriod) {
    case 'A':
      return '08.00 am - Midnight on Mondays to Saturdays (except Sundays and public holidays)';
    case 'B':
      return '08.00 am - 08.00 pm daily on Mondays to Saturdays (except Sundays and public holidays)';
    case 'D':
      return '08.00 am - Midnight on Mondays to Saturdays; 10.00 am - 10.00 pm on Sundays and public holidays';
    case 'E':
      return '07.00 am - 08.00 pm daily';
    case 'F':
      return '08.00 am - 09.00 pm daily';
    case 'H':
      return '08.00 am - 08.00 pm daily';
    case 'J':
      return '08.00 am - Midnight daily';
    case 'N':
      return '07.00 pm - Midnight daily';
    case 'P':
      return '08.00 am - 08.00 pm daily on Mondays to Saturdays (no parking on Sundays)';
    case 'Q':
      return '08.00 am - 08.00 pm daily on Mondays to Saturdays; 10.00 am - 10.00 pm daily on Sundays and public holidays';
    case 'S':
      return 'No parking on 08.00 am - 05.00 pm daily on Mondays to Fridays; 05.00 pm - Midnight daily on Mondays to Fridays; 08.00 am - Midnight daily on Saturdays; 10.00 am - 10.00 pm daily on Sundays and public holidays';
    default:
      return operatingPeriod ?? 'Unknown';
  }
}
