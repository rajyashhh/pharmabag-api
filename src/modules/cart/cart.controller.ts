import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BUYER)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * POST /api/cart/add
   * Add a product to the buyer's cart.
   */
  @Post('add')
  @HttpCode(HttpStatus.CREATED)
  async addToCart(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    const data = await this.cartService.addToCart(userId, dto);
    return { message: 'Product added to cart', data };
  }

  /**
   * GET /api/cart
   * Get the current buyer's cart with items, product & seller details.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getCart(@CurrentUser('id') userId: string) {
    const data = await this.cartService.getCart(userId);
    return { message: 'Cart retrieved successfully', data };
  }

  /**
   * PATCH /api/cart/item/:id
   * Update quantity of a cart item.
   */
  @Patch('item/:id')
  @HttpCode(HttpStatus.OK)
  async updateCartItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const data = await this.cartService.updateCartItem(userId, cartItemId, dto);
    return { message: 'Cart item updated', data };
  }

  /**
   * DELETE /api/cart/item/:id
   * Remove a single item from the cart.
   */
  @Delete('item/:id')
  @HttpCode(HttpStatus.OK)
  async removeCartItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) cartItemId: string,
  ) {
    return this.cartService.removeCartItem(userId, cartItemId);
  }

  /**
   * DELETE /api/cart
   * Clear entire cart.
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
