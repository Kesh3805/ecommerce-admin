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
    categories {
      __typename
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
    createdAt: created_at
    updatedAt: updated_at
    publishedAt: published_at
  }
`;

export const GET_PRODUCTS = gql`
  query GetProducts($filter: ProductFilterInput) {
    products(filter: $filter) {
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
      __typename
    }
  }
`;

export const GENERATE_VARIANTS = gql`
  mutation GenerateVariants($input: GenerateVariantsInput!) {
    generateVariants(input: $input) {
      __typename
    }
  }
`;

export const UPDATE_VARIANT = gql`
  mutation UpdateVariant($input: UpdateVariantInput!) {
    updateVariant(input: $input) {
      __typename
    }
  }
`;

export const GET_INVENTORY_LEVELS = gql`
  query GetInventoryLevels($variantId: Int!) {
    inventoryLevels(variantId: $variantId) {
      __typename
    }
  }
`;

export const GET_LOCATIONS = gql`
  query GetLocations($storeId: Int!) {
    locations(storeId: $storeId) {
      __typename
    }
  }
`;

export const ADJUST_INVENTORY = gql`
  mutation AdjustInventory($input: AdjustInventoryInput!) {
    adjustInventory(input: $input) {
      __typename
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories($storeId: Int!) {
    categories(storeId: $storeId) {
      id: category_id
      name
      slug
      parent_id
      metadata
    }
  }
`;
