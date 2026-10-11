// Limits of the offer fields, shared by the create and update DTOs.
export const OFFER_LIMITS = {
  title: 150,
  description: 5000,
  requirements: 5000,
  city: 100,
  salary: 9_999_999_999.99,
  vacancies: 100,
  tags: 10,
} as const;
