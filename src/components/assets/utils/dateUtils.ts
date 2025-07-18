export const isExpiringSoon = (expirationDate: string, beforeMonths?: number) => {
  const expiry = new Date(expirationDate);
  const today = new Date();
  
  if (beforeMonths) {
    const warningDate = new Date(expiry);
    warningDate.setMonth(warningDate.getMonth() - beforeMonths);
    return today >= warningDate && today < expiry;
  }
  
  const daysDiff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
  return daysDiff <= 30 && daysDiff >= 0;
};

export const isExpired = (expirationDate: string) => {
  const expiry = new Date(expirationDate);
  const today = new Date();
  return expiry < today;
};