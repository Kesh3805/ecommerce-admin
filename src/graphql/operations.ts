import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      tokenType
      expiresIn
    }
  }
`;

export const PRODUCT_FRAGMENT = gql`
  fragment ProductFields on Product {
    id: product_id
    storeId: store_id
    title
    description
    status
    brand
    publishedAt: published_at
    createdAt: created_at
    updatedAt: updated_at
    seo {
      handle
      meta_title
      meta_description
    }
    metafields {
      key
      value
    }
    country_codes
    categories {
      id: category_id
      name
      slug
    }
    options {
      id: option_id
      name
      position
      values {
        id: value_id
        value
        position
      }
    }
  }
`;

export const PRODUCT_LIST_FRAGMENT = gql`
  fragment ProductListFields on Product {
    id: product_id
    title
    status
    brand
    primaryImageUrl: primary_image_url
    mediaUrls: media_urls
    createdAt: created_at
    updatedAt: updated_at
    publishedAt: published_at
  }
`;

export const GET_PRODUCTS = gql`
  query GetProducts($filter: ProductFilterInput, $pagination: PaginationInput) {
    products(filter: $filter, pagination: $pagination) {
      items {
        ...ProductListFields
      }
      total
      hasNextPage
      hasPreviousPage
      page
      totalPages
      limit
    }
  }
  ${PRODUCT_LIST_FRAGMENT}
`;

export const GET_MY_STORES = gql`
  query GetMyStores {
    myStores {
      store_id
      name
      owner_user_id
    }
  }
`;

export const GET_USERS_SUMMARY = gql`
  query GetUsersSummary($input: GetUsersInput) {
    users(input: $input) {
      pagination {
        total
      }
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: Int!) {
    product(id: $id) {
      ...ProductFields
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      ...ProductFields
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($input: UpdateProductInput!) {
    updateProduct(input: $input) {
      ...ProductFields
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const BULK_IMPORT_PRODUCTS = gql`
  mutation BulkImportProducts($input: BulkImportProductsInput!) {
    bulkImportProducts(input: $input) {
      total_rows
      success_count
      failure_count
      results {
        row_number
        success
        message
        product_id
        handle
      }
    }
  }
`;

export const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: Int!) {
    deleteProduct(id: $id)
  }
`;

export const PUBLISH_PRODUCT = gql`
  mutation PublishProduct($id: Int!) {
    publishProduct(id: $id) {
      id: product_id
      status
      publishedAt: published_at
    }
  }
`;

export const ARCHIVE_PRODUCT = gql`
  mutation ArchiveProduct($id: Int!) {
    archiveProduct(id: $id) {
      id: product_id
      status
    }
  }
`;

export const ADD_PRODUCT_OPTION = gql`
  mutation AddProductOption($input: AddProductOptionInput!) {
    addProductOption(input: $input) {
      id: option_id
      name
      position
      values {
        id: value_id
        value
        position
      }
    }
  }
`;

export const GET_VARIANTS = gql`
  query GetVariants($productId: Int!) {
    variants(productId: $productId) {
      id: variant_id
      title
      option1_value
      option2_value
      option3_value
      sku
      price
      compareAtPrice: compare_at_price
      media_urls
      inventoryPolicy: inventory_policy
      inventoryItemId: inventory_item_id
      inventory_item {
        id: inventory_item_id
        total_available
        levels {
          available_quantity
          reserved_quantity
          location_id
        }
      }
    }
  }
`;

export const GENERATE_VARIANTS = gql`
  mutation GenerateVariants($input: GenerateVariantsInput!) {
    generateVariants(input: $input) {
      created
      variants {
        id: variant_id
        title
        sku
        price
        media_urls
        inventoryPolicy: inventory_policy
        inventoryItemId: inventory_item_id
      }
    }
  }
`;

export const UPDATE_VARIANT = gql`
  mutation UpdateVariant($input: UpdateVariantInput!) {
    updateVariant(input: $input) {
      id: variant_id
      title
      sku
      price
      compareAtPrice: compare_at_price
      media_urls
      inventoryPolicy: inventory_policy
      inventoryItemId: inventory_item_id
      inventory_item {
        id: inventory_item_id
        total_available
      }
    }
  }
`;

export const DELETE_VARIANT = gql`
  mutation DeleteVariant($id: Int!) {
    deleteVariant(id: $id)
  }
`;

export const CREATE_VARIANT = gql`
  mutation CreateVariant($input: CreateVariantInput!) {
    createVariant(input: $input) {
      id: variant_id
      title
      sku
      price
      compareAtPrice: compare_at_price
      media_urls
      inventoryPolicy: inventory_policy
      inventoryItemId: inventory_item_id
      inventory_item {
        id: inventory_item_id
        total_available
      }
    }
  }
`;

export const GET_INVENTORY_LEVELS = gql`
  query GetInventoryLevels($variantId: Int!) {
    inventoryLevels(variantId: $variantId) {
      inventory_level_id
      available_quantity
      reserved_quantity
      location_id
      location {
        location_id
        name
      }
    }
  }
`;

export const GET_LOCATIONS = gql`
  query GetLocations($storeId: Int!) {
    locations(storeId: $storeId) {
      location_id
      name
      is_active
    }
  }
`;

export const GET_AVAILABLE_COUNTRIES = gql`
  query GetAvailableCountries($storeId: Int!) {
    availableCountries(storeId: $storeId)
  }
`;

export const SET_STORE_COUNTRIES = gql`
  mutation SetStoreCountries($input: SetStoreCountriesInput!) {
    setStoreCountries(input: $input)
  }
`;

export const ADJUST_INVENTORY = gql`
  mutation AdjustInventory($input: AdjustInventoryInput!) {
    adjustInventory(input: $input) {
      level {
        inventory_level_id
        available_quantity
        reserved_quantity
        location_id
      }
      adjustment {
        adjustment_id
        quantity
        reason
      }
    }
  }
`;

export const SET_INVENTORY_LEVEL = gql`
  mutation SetInventoryLevel($input: SetInventoryLevelInput!) {
    setInventoryLevel(input: $input) {
      level {
        inventory_level_id
        available_quantity
        reserved_quantity
        location_id
      }
      adjustment {
        adjustment_id
        quantity
        reason
      }
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories($storeId: Int) {
    categories(storeId: $storeId) {
      id: category_id
      name
      slug
      parent_id
      metadata
    }
  }
`;

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id: category_id
      name
      slug
      parent_id
      metadata
    }
  }
`;

export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: Int!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id: category_id
      name
      slug
      parent_id
      metadata
    }
  }
`;

export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: Int!) {
    deleteCategory(id: $id)
  }
`;

export const GET_BRANDS = gql`
  query GetBrands($storeId: Int) {
    brands(storeId: $storeId) {
      brand_id
      store_id
      store_name
      name
      slug
      created_at
      updated_at
    }
  }
`;

export const CREATE_BRAND = gql`
  mutation CreateBrand($input: CreateBrandInput!) {
    createBrand(input: $input) {
      brand_id
      store_id
      store_name
      name
      slug
      created_at
      updated_at
    }
  }
`;

export const UPDATE_BRAND = gql`
  mutation UpdateBrand($input: UpdateBrandInput!) {
    updateBrand(input: $input) {
      brand_id
      store_id
      store_name
      name
      slug
      created_at
      updated_at
    }
  }
`;

export const DELETE_BRAND = gql`
  mutation DeleteBrand($brandId: Int!) {
    deleteBrand(brandId: $brandId)
  }
`;

export const ATTACH_PRODUCT_MEDIA = gql`
  mutation AttachProductMedia($input: AttachProductMediaInput!) {
    attachProductMedia(input: $input) {
      id: media_id
      product_id
      url
      altText: alt_text
      position
      isCover: is_cover
      type
    }
  }
`;

export const GET_PRODUCT_MEDIA = gql`
  query GetProductMedia($productId: Int!) {
    productMedia(productId: $productId) {
      id: media_id
      url
      altText: alt_text
      position
      isCover: is_cover
      type
    }
  }
`;

export const DELETE_PRODUCT_MEDIA = gql`
  mutation DeleteProductMedia($mediaId: Int!) {
    deleteProductMedia(mediaId: $mediaId)
  }
`;

// Collection queries for merchandising
// NOTE: Collection mutations (CREATE, UPDATE, DELETE, etc.) are in merchandising.ts
export const GET_COLLECTIONS = gql`
  query GetCollections($filter: CollectionFilterInput) {
    collections(filter: $filter) {
      id: collection_id
      name
      slug
      description
      type: collection_type
      isVisible: is_visible
      productCount: product_count
      imageUrl: image_url
    }
  }
`;

export const GET_COLLECTION = gql`
  query GetCollection($id: Int!) {
    collection(collectionId: $id) {
      id: collection_id
      name
      slug
      description
      type: collection_type
      isVisible: is_visible
      productCount: product_count
      imageUrl: image_url
      metaTitle: meta_title
      metaDescription: meta_description
      products(limit: 100) {
        product_id
        title
        status
      }
      rules {
        ruleId: rule_id
        field
        operator
        value
        valueType: value_type
        ruleGroup: rule_group
      }
    }
  }
`;
