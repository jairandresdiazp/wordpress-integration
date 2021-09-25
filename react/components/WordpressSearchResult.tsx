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
import SearchPosts from '../graphql/SearchPosts.graphql'
import Settings from '../graphql/Settings.graphql'
import WordpressCategorySelect from './WordpressCategorySelect'
import WordpressTagSelect from './WordpressTagSelect'

interface SearchProps {
  customDomains: string
  subcategoryUrls: boolean
  mediaSize: MediaSize
  postsPerPage: number
}

const CSS_HANDLES = [
  'listTitle',
  'searchListTitle',
  'listContainer',
  'searchListContainer',
  'listFlex',
  'searchListFlex',
  'listFlexItem',
  'searchListFlexItem',
  'paginationComponent',
  'filtersContainer',
  'categorySelectContainer',
  'tagSelectContainer',
] as const

const WordpressSearchResult: StorefrontFunctionComponent<SearchProps> = ({
  customDomains,
  subcategoryUrls,
  mediaSize,
  postsPerPage,
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
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [selectedTag, setSelectedTag] = useState('')
  const [tags, setTags] = useState([])
  const handles = useCssHandles(CSS_HANDLES)
  const { loading: loadingS, data: dataS } = useQuery(Settings)
  const { loading, error, data, fetchMore } = useQuery(SearchPosts, {
    skip: !params,
    variables: {
      terms: params.term || params.term_id,
      wp_page: 1,
      wp_per_page: 10,
      customDomain,
    },
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

  useEffect(() => {
    data &&
      setCategories(
        data.wpPostsSearch.posts
          .reduce((acc: any, el: any) => [...acc, ...el.categories], [])
          .reduce((acc: any, current: any) => {
            const x = acc.find((item: any) => item.id === current.id)
            return !x ? acc.concat([current]) : acc
          }, [])
      )
    data &&
      setTags(
        data.wpPostsSearch.posts
          .reduce((acc: any, el: any) => [...acc, ...el.tags], [])
          .reduce((acc: any, el: any) => {
            const x = acc.find((item: any) => item.id === el.id)
            return !x ? acc.concat([el]) : acc
          }, [])
      )
  }, [data])

  if (!params?.term && !params?.term_id) return null

  const term = params.term || params.term_id

  const paginationComponent = (
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
      totalItems={data?.wpPostsSearch?.total_count ?? 0}
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
            terms: term,
            customDomain,
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
            terms: term,
            customDomain,
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
            terms: term,
            customDomain,
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
      <Helmet>
        <title>
          {dataS?.appSettings?.titleTag
            ? `Article search results for ${decodeURIComponent(term)} | ${
                dataS.appSettings.titleTag
              }`
            : `Article search results for ${decodeURIComponent(term)}`}
        </title>
      </Helmet>
      <h2
        className={`${handles.listTitle} ${handles.searchListTitle} t-heading-2 tc`}
      >
        Article search results for &quot;{decodeURIComponent(term)}
        &quot;
      </h2>

      <Container
        className={`${handles.listContainer} ${handles.searchListContainer} pt2 pb8`}
        style={{ maxWidth: '90%' }}
        ref={containerRef}
      >
        <div className={`${handles.paginationComponent} ph3`}>
          {paginationComponent}
        </div>
        <div
          className={`${handles.filtersContainer} flex flex-row justify-between mt3 ph3`}
        >
          {dataS?.appSettings?.filterByCategories && (
            <div className={`${handles.categorySelectContainer} w-40`}>
              <WordpressCategorySelect
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
            </div>
          )}
          {dataS?.appSettings?.filterByTags && (
            <div className={`${handles.tagSelectContainer} w-40`}>
              <WordpressTagSelect
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
                tags={tags}
              />
            </div>
          )}
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
        {data?.wpPostsSearch ? (
          <Fragment>
            <div
              className={`${handles.listFlex} ${handles.searchListFlex} mv4 flex flex-row flex-wrap`}
            >
              {data.wpPostsSearch.posts
                .filter(
                  (post: any) =>
                    (selectedCategory && selectedCategory !== 'all'
                      ? post.categories.find(
                          (category: any) => category.name === selectedCategory
                        )
                      : post) &&
                    (selectedTag && selectedTag !== 'all'
                      ? post.tags.find((tag: any) => tag.name === selectedTag)
                      : post)
                )
                .map((post: PostData, index: number) => (
                  <div
                    key={index}
                    className={`${handles.listFlexItem} ${handles.searchListFlexItem} mv3 w-100-s w-50-l ph4`}
                  >
                    <WordpressTeaser
                      title={post.title.rendered}
                      author={post.author?.name}
                      categories={post.categories}
                      subcategoryUrls={subcategoryUrls}
                      customDomainSlug={params.customdomainslug}
                      excerpt={post.excerpt.rendered}
                      date={post.date}
                      id={post.id}
                      slug={post.slug}
                      link={post.link}
                      featuredMedia={post.featured_media}
                      mediaSize={mediaSize}
                      showAuthor={false}
                      showCategory
                      showDate
                      showExcerpt
                      absoluteLinks={false}
                      useTextOverlay={false}
                    />
                  </div>
                ))}
            </div>
            <div className={`${handles.paginationComponent} ph3 mb7`}>
              {paginationComponent}
            </div>
          </Fragment>
        ) : (
          <div>
            <h2>No posts found.</h2>
          </div>
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
    id: 'admin/editor.wordpressSearchResult.title',
  },
  description: {
    defaultMessage: '',
    id: 'admin/editor.wordpressSearchResult.description',
  },
  customDomainsTitle: {
    defaultMessage: '',
    id: 'admin/editor.wordpressCustomDomains.title',
  },
  customDomainsDescription: {
    defaultMessage: '',
    id: 'admin/editor.wordpressCustomDomains.description',
  },
  subcategoryUrlsTitle: {
    defaultMessage: '',
    id: 'admin/editor.wordpressSubcategoryUrls.title',
  },
  subcategoryUrlsDescription: {
    defaultMessage: '',
    id: 'admin/editor.wordpressSubcategoryUrls.description',
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

WordpressSearchResult.defaultProps = {
  customDomains: undefined,
  subcategoryUrls: false,
  mediaSize: undefined,
  postsPerPage: 10,
}

WordpressSearchResult.schema = {
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
    subcategoryUrls: {
      title: messages.subcategoryUrlsTitle.id,
      description: messages.subcategoryUrlsDescription.id,
      type: 'boolean',
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

export default WordpressSearchResult
