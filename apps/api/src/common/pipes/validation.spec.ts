import { Type } from 'class-transformer';
import { IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { AppException } from '../errors/app.exception.js';
import { createValidationPipe } from './validation.js';

class LineDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}

class BodyDto {
  @IsString()
  name!: string;

  @ValidateNested({ each: true })
  @Type(() => LineDto)
  items!: LineDto[];
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const meta = { type: 'body' as const, metatype: BodyDto };

  it('accepte un corps valide', async () => {
    await expect(
      pipe.transform({ name: 'A', items: [{ quantity: 2 }] }, meta),
    ).resolves.toBeInstanceOf(BodyDto);
  });

  it('renvoie VALIDATION_FAILED avec les champs en erreur, y compris imbriqués', async () => {
    const error: unknown = await pipe
      .transform({ name: 3, items: [{ quantity: 0 }] }, meta)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    const app = error as AppException;
    expect(app.code).toBe('VALIDATION_FAILED');
    expect(app.details).toEqual({
      fields: [
        { field: 'name', constraints: ['isString'] },
        { field: 'items.0.quantity', constraints: ['min'] },
      ],
    });
  });

  it('refuse les propriétés inconnues (tenantId injecté par exemple)', async () => {
    const error = (await pipe
      .transform({ name: 'A', items: [], tenantId: 'x' }, meta)
      .catch((e: unknown) => e)) as AppException;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details).toEqual({
      fields: [{ field: 'tenantId', constraints: ['whitelistValidation'] }],
    });
  });
});
