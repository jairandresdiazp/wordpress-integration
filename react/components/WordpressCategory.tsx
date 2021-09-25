/* eslint-disable @typescript-eslint/camelcase */
import { Container } from 'vtex.store-components'
import React, {
  ChangeEvent,
  Fragment,
  useState,
  useEffect,
  useRef,
} from 'react'
import { useQuery } from 'react-apollo'
import { defineMessages, useIntl } from 'react-intl'
import { useRuntime } from 'vtex.render-runtime'
import { Spinner, Pagination } from 'vtex.styleguide'
import Helmet from 'react-helmet'
import { useCssHandles } from 'vtex.css-handles'

import WordpressTeaser from './WordpressTeaser'
import CategoryPostsBySlug from '../graphql/CategoryPostsBySlug.graphql'
import Settings from '../graphql/Settings.graphql'

interface CategoryProps {
  customDomains: string
  postsPerPage: number
  mediaSize: MediaSize
}

const CSS_HANDLES = [
  'listTitle',
  'listContainer',
  'listFlex',
  'listFlexItem',
  'paginationComponent',
] as const

const WordpressCategory: StorefrontFunctionComponent<CategoryProps> = ({
  customDomains,
  postsPerPage,
  mediaSize,
}) => {
  const intl = useIntl()
  const {
    route: { id, params },
    pages,
    query,
    setQuery,
    navigate,
  } = useRuntime() as any

  let parsedCustomDomains = null
  try {
    parsedCustomDomains = customDomains ? JSON.parse(customDomains) : null
  } catch (e) {
    console.error(e)
  }

  const customDomain =
    params.customdomainslug && parsedCustomDomains
      ? parsedCustomDomains[params.customdomainslug]
      : undefined

  const initialPage = params.page ?? query?.page ?? '1'
  const [page, setPage] = useState(parseInt(initialPage, 10))
  const [perPage, setPerPage] = useState(postsPerPage)
  const [selectedOption, setSelectedOption] = useState(postsPerPage)
  const categoryVariable = {
    categorySlug:
      params.subcategoryslug_id ||
      params.categoryslug ||
      params.categoryslug_id,
  }
  const handles = useCssHandles(CSS_HANDLES)
  const { loading: loadingS, data: dataS } = useQuery(Settings)
  const { loading, error, data, fetchMore } = useQuery(CategoryPostsBySlug, {
    variables: {
      ...categoryVariable,
      wp_page: 1,
      wp_per_page: perPage,
      customDomain,
    },
    skip: !categoryVariable.categorySlug,
  })

  const containerRef = useRef<null | HTMLElement>(null)
  const initialPageLoad = useRef(true)

  useEffect(() => {
    if (initialPageLoad.current) {
      initialPageLoad.current = false

      return
    }
    if (containerRef.current) {
      window.scrollTo({
        top:
          containerRef.current.getBoundingClientRect().top +
          window.pageYOffset -
          100,
        behavior: 'smooth',
      })
    }
  }, [page])

  const PaginationComponent = (
    <Pagination
      rowsOptions={[
        postsPerPage,
        postsPerPage * 2,
        postsPerPage * 3,
        postsPerPage * 4,
      ]}
      selectedOption={selectedOption}
      currentItemFrom={(page - 1) * perPage + 1}
      currentItemTo={page * perPage}
      textOf="of"
      textShowRows={
        dataS?.appSettings?.displayShowRowsText === false
          ? null
          : // eslint-disable-next-line @typescript-eslint/no-use-before-define
            intl.formatMessage(messages.postsPerPage)
      }
      totalItems={data?.wpCategories?.categories[0]?.wpPosts?.total_count ?? 0}
      onRowsChange={({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
        setPage(1)
        if (pages[id].path.indexOf(':page') > 0) {
          params.page = '1'
          navigate({
            page: id,
            params,
            scrollOptions: false,
          })
        } else {
          setQuery({ page: '1' })
        }
        setSelectedOption(+value)
        setPerPage(+value)
        fetchMore({
          variables: {
            wp_page: 1,
            wp_per_page: +value,
            customDomain,
            ...categoryVariable,
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev
            return fetchMoreResult
          },
        })
      }}
      onPrevClick={() => {
        if (page <= 1) return
        const prevPage = page - 1
        setPage(prevPage)
        if (pages[id].path.indexOf(':page') > 0) {
          params.page = prevPage.toString()
          navigate({
            page: id,
            params,
            scrollOptions: false,
          })
        } else {
          setQuery({ page: prevPage.toString() })
        }
        fetchMore({
          variables: {
            wp_page: prevPage,
            wp_per_page: perPage,
            customDomain,
            ...categoryVariable,
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev
            return fetchMoreResult
          },
        })
      }}
      onNextClick={() => {
        const nextPage = page + 1
        setPage(nextPage)
        if (pages[id].path.indexOf(':page') > 0) {
          params.page = nextPage.toString()
          navigate({
            page: id,
            params,
            scrollOptions: false,
          })
        } else {
          setQuery({ page: nextPage.toString() })
        }
        fetchMore({
          variables: {
            wp_page: nextPage,
            wp_per_page: perPage,
            customDomain,
            ...categoryVariable,
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev
            return fetchMoreResult
          },
        })
      }}
    />
  )
  return (
    <Fragment>
      {dataS && data?.wpCategories?.categories?.length > 0 && (
        <Fragment>
          <Helmet>
            <title>
              {dataS?.appSettings?.titleTag
                ? `${data.wpCategories.categories[0].name} | ${dataS.appSettings.titleTag}`
                : data.wpCategories.categories[0].name}
            </title>
          </Helmet>
          <h2 className={`${handles.listTitle} t-heading-2 tc`}>
            {data.wpCategories.categories[0].name}
          </h2>
        </Fragment>
      )}
      <Container
        className={`${handles.listContainer} pt2 pb8`}
        style={{ maxWidth: '90%' }}
        ref={containerRef}
      >
        <div className={`${handles.paginationComponent} ph3`}>
          {PaginationComponent}
        </div>
        {(loading || loadingS) && (
          <div className="mv5 flex justify-center" style={{ minHeight: 800 }}>
            <Spinner />
          </div>
        )}
        {error && (
          <div className="ph5" style={{ minHeight: 800 }}>
            Error: {error.message}
          </div>
        )}
        {data?.wpCategories?.categories?.length ? (
          <Fragment>
            <div className={`${handles.listFlex} mv4 flex flex-row flex-wrap`}>
              {data.wpCategories.categories[0].wpPosts.posts.map(
                (post: PostData, index: number) => (
                  <div
                    key={index}
                    className={`${handles.listFlexItem} mv3 w-100-s w-50-l ph4`}
                  >
                    <WordpressTeaser
                      title={post.title.rendered}
                      author={post.author?.name}
                      excerpt={post.excerpt.rendered}
                      date={post.date}
                      id={post.id}
                      slug={post.slug}
                      link={post.link}
                      customDomainSlug={params.customdomainslug}
                      featuredMedia={post.featured_media}
                      mediaSize={mediaSize}
                      showAuthor={false}
                      showCategory={false}
                      showDate
                      showExcerpt
                      useTextOverlay={false}
                      absoluteLinks={false}
                    />
                  </div>
                )
              )}
            </div>
            <div className={`${handles.paginationComponent} ph3 mb7`}>
              {PaginationComponent}
            </div>
          </Fragment>
        ) : (
          !loading &&
          !loadingS &&
          !error && (
            <div>
              <h2>No posts found.</h2>
            </div>
          )
        )}
      </Container>
    </Fragment>
  )
}

const messages = defineMessages({
  postsPerPage: {
    defaultMessage: 'posts per page',
    id: 'store/wordpress-integration.wordpressPagination.postsPerPage',
  },
  title: {
    defaultMessage: '',
    id: 'admin/editor.wordpressCategory.title',
  },
  description: {
    defaultMessage: '',
    id: 'admin/editor.wordpressCategory.description',
  },
  customDomainsTitle: {
    defaultMessage: '',
    id: 'admin/editor.wordpressCustomDomain.title',
  },
  customDomainsDescription: {
    defaultMessage: '',
    id: 'admin/editor.wordpressCustomDomain.description',
  },
  mediaSizeTitle: {
    defaultMessage: '',
    id: 'admin/editor.wordpressMediaSize.title',
  },
  mediaSizeDescription: {
    defaultMessage: '',
    id: 'admin/editor.wordpressMediaSize.description',
  },
})

WordpressCategory.defaultProps = {
  customDomains: undefined,
  postsPerPage: 10,
  mediaSize: undefined,
}

WordpressCategory.schema = {
  title: messages.title.id,
  description: messages.description.id,
  type: 'object',
  properties: {
    customDomains: {
      title: messages.customDomainsTitle.id,
      description: messages.customDomainsDescription.id,
      type: 'string',
      isLayout: false,
      default: '',
    },
    mediaSize: {
      title: messages.mediaSizeTitle.id,
      description: messages.mediaSizeDescription.id,
      type: 'string',
      enum: ['thumbnail', 'medium', 'medium_large', 'large', 'full'],
      enumNames: ['Thumbnail', 'Medium', 'Medium Large', 'Large', 'Full'],
      isLayout: false,
      default: '',
    },
  },
}

export default WordpressCategory
