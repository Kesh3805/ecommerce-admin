/**
 * Admin Merchandising GraphQL Queries & Mutations
 * For managing collections, storefront pages, and sections
 */

import { gql } from '@apollo/client';

// ============================================================================
// COLLECTION MANAGEMENT
// ============================================================================

export const CREATE_COLLECTION = gql`
  mutation CreateCollection($input: CreateCollectionInput!) {
    createCollection(input: $input) {
      collection_id
      store_id
      name
      slug
      description
      collection_type
      image_url
      is_visible
      created_at
    }
  }
`;

export const UPDATE_COLLECTION = gql`
  mutation UpdateCollection($input: UpdateCollectionInput!) {
    updateCollection(input: $input) {
      collection_id
      name
      slug
      description
      image_url
      is_visible
      updated_at
    }
  }
`;

export const DELETE_COLLECTION = gql`
  mutation DeleteCollection($collectionId: Int!) {
    deleteCollection(collectionId: $collectionId)
  }
`;

export const ADD_PRODUCTS_TO_COLLECTION = gql`
  mutation AddProductsToCollection($input: AddProductsToCollectionInput!) {
    addProductsToCollection(input: $input) {
      collection_id
      product_count
    }
  }
`;

export const REMOVE_PRODUCTS_FROM_COLLECTION = gql`
  mutation RemoveProductsFromCollection($collectionId: Int!, $productIds: [Int!]!) {
    removeProductsFromCollection(collectionId: $collectionId, productIds: $productIds) {
      collection_id
      product_count
    }
  }
`;

export const REORDER_COLLECTION_PRODUCTS = gql`
  mutation ReorderCollectionProducts($collectionId: Int!, $productIds: [Int!]!) {
    reorderCollectionProducts(collectionId: $collectionId, productIds: $productIds) {
      collection_id
    }
  }
`;

export const SET_COLLECTION_RULES = gql`
  mutation SetCollectionRules($collectionId: Int!, $rules: [CollectionRuleInput!]!) {
    setCollectionRules(collectionId: $collectionId, rules: $rules) {
      collection_id
      rules {
        rule_id
        field
        operator
        value
        value_type
      }
    }
  }
`;

export const GET_COLLECTION_WITH_PRODUCTS = gql`
  query GetCollectionWithProducts($collectionId: Int!, $limit: Int, $offset: Int) {
    collection(collectionId: $collectionId) {
      collection_id
      store_id
      name
      slug
      description
      collection_type
      image_url
      is_visible
      product_count
      created_at
      updated_at
      products(limit: $limit, offset: $offset) {
        product_id
        title
        status
      }
      rules {
        rule_id
        field
        operator
        value
        value_type
      }
    }
  }
`;

export const GET_ALL_COLLECTIONS = gql`
  query GetAllCollections($filter: CollectionFilterInput) {
    collections(filter: $filter) {
      collection_id
      store_id
      name
      slug
      collection_type
      is_visible
      product_count
      created_at
    }
  }
`;

// ============================================================================
// STOREFRONT PAGE MANAGEMENT
// ============================================================================

export const CREATE_STOREFRONT_PAGE = gql`
  mutation CreateStorefrontPage($input: CreatePageInput!) {
    createStorefrontPage(input: $input) {
      page_id
      store_id
      page_type
      slug
      name
      is_published
      created_at
    }
  }
`;

export const UPDATE_STOREFRONT_PAGE = gql`
  mutation UpdateStorefrontPage($input: UpdatePageInput!) {
    updateStorefrontPage(input: $input) {
      page_id
      name
      slug
      meta_title
      meta_description
      updated_at
    }
  }
`;

export const PUBLISH_STOREFRONT_PAGE = gql`
  mutation PublishStorefrontPage($pageId: Int!) {
    publishStorefrontPage(pageId: $pageId) {
      page_id
      is_published
      published_at
    }
  }
`;

export const UNPUBLISH_STOREFRONT_PAGE = gql`
  mutation UnpublishStorefrontPage($pageId: Int!) {
    unpublishStorefrontPage(pageId: $pageId) {
      page_id
      is_published
    }
  }
`;

// ============================================================================
// PAGE SECTION MANAGEMENT
// ============================================================================

export const CREATE_PAGE_SECTION = gql`
  mutation CreatePageSection($input: CreateSectionInput!) {
    createPageSection(input: $input) {
      section_id
      page_id
      section_type
      title
      subtitle
      position
      is_visible
      config
      created_at
    }
  }
`;

export const UPDATE_PAGE_SECTION = gql`
  mutation UpdatePageSection($input: UpdateSectionInput!) {
    updatePageSection(input: $input) {
      section_id
      title
      subtitle
      position
      is_visible
      config
      updated_at
    }
  }
`;

export const DELETE_PAGE_SECTION = gql`
  mutation DeletePageSection($sectionId: Int!) {
    deletePageSection(sectionId: $sectionId)
  }
`;

export const REORDER_PAGE_SECTIONS = gql`
  mutation ReorderPageSections($pageId: Int!, $sectionIds: [Int!]!) {
    reorderPageSections(pageId: $pageId, sectionIds: $sectionIds) {
      page_id
    }
  }
`;

// ============================================================================
// HERO BANNER MANAGEMENT
// ============================================================================

export const CREATE_HERO_BANNER = gql`
  mutation CreateHeroBanner($input: CreateHeroBannerInput!) {
    createHeroBanner(input: $input) {
      banner_id
      section_id
      title
      subtitle
      cta_text
      cta_link
      desktop_image_url
      mobile_image_url
      video_url
      position
      text_color
      overlay_opacity
      text_position
      created_at
    }
  }
`;

export const DELETE_HERO_BANNER = gql`
  mutation DeleteHeroBanner($bannerId: Int!) {
    deleteHeroBanner(bannerId: $bannerId)
  }
`;

// ============================================================================
// SECTION ASSOCIATIONS
// ============================================================================

export const ADD_COLLECTION_TO_SECTION = gql`
  mutation AddCollectionToSection($sectionId: Int!, $collectionId: Int!) {
    addCollectionToSection(sectionId: $sectionId, collectionId: $collectionId)
  }
`;

export const ADD_CATEGORY_TO_SECTION = gql`
  mutation AddCategoryToSection($sectionId: Int!, $categoryId: Int!, $customImageUrl: String) {
    addCategoryToSection(sectionId: $sectionId, categoryId: $categoryId, customImageUrl: $customImageUrl)
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_STOREFRONT_PAGE = gql`
  query GetStorefrontPage($pageId: Int!) {
    storefrontPage(pageId: $pageId) {
      page_id
      store_id
      page_type
      slug
      name
      meta_title
      meta_description
      is_published
      published_at
      created_at
      updated_at
    }
  }
`;

export const GET_HOMEPAGE_PREVIEW = gql`
  query GetHomepagePreview($storeId: Int!) {
    homepage(storeId: $storeId) {
      page_id
      name
      sections {
        section_id
        section_type
        title
        subtitle
        position
        is_visible
        config
      }
    }
  }
`;
