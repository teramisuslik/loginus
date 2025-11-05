import { IsString, IsNotEmpty } from 'class-validator';

export class OAuthTokenDto {
  @IsString()
  @IsNotEmpty()
  grant_type: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  redirect_uri: string;

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsNotEmpty()
  client_secret: string;
}

