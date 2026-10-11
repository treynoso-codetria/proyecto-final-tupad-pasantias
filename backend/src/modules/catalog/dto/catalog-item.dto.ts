import { ApiProperty } from '@nestjs/swagger';

// A category or a tag, as offers and filters reference them.
export class CatalogItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Desarrollo de Software' })
  name: string;

  @ApiProperty({
    example: 'desarrollo-de-software',
    description: 'Stable, URL-friendly identifier used by the offer filters',
  })
  slug: string;
}
