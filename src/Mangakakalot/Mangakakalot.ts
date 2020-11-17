import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, MangaUpdates, PagedResults, SourceTag, TagType } from "paperback-extensions-common"

const MK_DOMAIN = 'https://mangakakalot.com'
let MK_IMAGE_DOMAIN = 'https://avt.mkklcdnv6.com/'

export class Mangakakalot extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  // @getBoolean
  get version(): string { return '0.0.15'; }
  get name(): string { return 'Mangakakalot' }
  get icon(): string { return 'mangakakalot.com.ico' }
  get author(): string { return 'getBoolean' }
  get authorWebsite(): string { return 'https://github.com/getBoolean' }
  get description(): string { return 'Extension that pulls manga from Mangakakalot' }
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { return `${MK_DOMAIN}/manga/${mangaId}` }
  get websiteBaseURL(): string { return MK_DOMAIN }
  get rateLimit(): Number {
    return 2
  }

  get sourceTags(): SourceTag[] {
    return [
      {
        text: "WIP",
        type: TagType.RED
      }
    ]
  }

  getMangaDetailsRequest(ids: string[]): Request[] {
    let requests: Request[] = []
    for (let id of ids) {
      let metadata = { 'id': id }
      requests.push(createRequestObject({
        url: `${MK_DOMAIN}/manga/`,
        metadata: metadata,
        method: 'GET',
        param: id
      }))
    }
    return requests
  }

  getMangaDetails(data: any, metadata: any): Manga[] {
    let manga: Manga[] = []
    let $ = this.cheerio.load(data)
    let json = JSON.parse($('[type=application\\/ld\\+json]').html()?.replace(/\t*\n*/g, '') ?? '')
    let entity = json.mainEntity
    let info = $('.row')
    let imgSource = ($('.ImgHolder').html()?.match(/src="(.*)\//) ?? [])[1];
    if (imgSource !== MK_IMAGE_DOMAIN)
      MK_IMAGE_DOMAIN = imgSource;
    let image = `${MK_IMAGE_DOMAIN}/${metadata.id}.jpg`
    let title = $('h1', info).first().text() ?? ''
    let titles = [title]
    let author = entity.author[0]
    titles = titles.concat(entity.alternateName)
    let follows = Number(($.root().html()?.match(/vm.NumSubs = (.*);/) ?? [])[1])

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
    createTagSection({ id: '1', label: 'format', tags: [] })]
    tagSections[0].tags = entity.genre.map((elem: string) => createTag({ id: elem, label: elem }))
    let update = entity.dateModified

    let status = MangaStatus.ONGOING
    let summary = ''
    let hentai = false

    let details = $('.list-group', info)
    for (let row of $('li', details).toArray()) {
      let text = $('.mlabel', row).text()
      switch (text) {
        case 'Type:': {
          let type = $('a', row).text()
          tagSections[1].tags.push(createTag({ id: type.trim(), label: type.trim() }))
          break
        }
        case 'Status:': {
          status = $(row).text().includes('Ongoing') ? MangaStatus.ONGOING : MangaStatus.COMPLETED
          break
        }
        case 'Description:': {
          summary = $('div', row).text().trim()
          break
        }
      }
    }

    manga.push(createManga({
      id: metadata.id,
      titles: titles,
      image: image,
      rating: 0,
      status: status,
      author: author,
      tags: tagSections,
      desc: summary,
      hentai: hentai,
      follows: follows,
      lastUpdate: update
    }))
    return manga
  }

  getChaptersRequest(mangaId: string): Request {
    let metadata = { 'id': mangaId }
    return createRequestObject({
      url: `${MK_DOMAIN}/manga/`,
      method: "GET",
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      param: mangaId
    })
  }

  getChapters(data: any, metadata: any): Chapter[] {
    let $ = this.cheerio.load(data)
    let chapterJS: any[] = JSON.parse(($.root().html()?.match(/vm.Chapters = (.*);/) ?? [])[1]).reverse()
    let chapters: Chapter[] = []
    // following the url encoding that the website uses, same variables too
    chapterJS.forEach((elem: any) => {
      let chapterCode: string = elem.Chapter
      let vol = Number(chapterCode.substring(0, 1))
      let index = vol != 1 ? '-index-' + vol : ''
      let n = parseInt(chapterCode.slice(1, -1))
      let a = Number(chapterCode[chapterCode.length - 1])
      let m = a != 0 ? '.' + a : ''
      let id = metadata.id + '-chapter-' + n + m + index + '.html'
      let chNum = n + a * .1
      let name = elem.ChapterName ? elem.ChapterName : '' // can be null
      let time = Date.parse(elem.Date.replace(" ", "T"))

      chapters.push(createChapter({
        id: id,
        mangaId: metadata.id,
        name: name,
        chapNum: chNum,
        langCode: LanguageCode.ENGLISH,
        time: isNaN(time) ? new Date() : new Date(time)
      }))
    })

    return chapters
  }

  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    let metadata = { 'mangaId': mangaId, 'chapterId': chapId, 'nextPage': false, 'page': 1 }
    return createRequestObject({
      url: `${MK_DOMAIN}/read-online/`,
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      method: 'GET',
      param: chapId
    })
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {
    let pages: string[] = []
    let pathName = JSON.parse((data.match(/vm.CurPathName = (.*);/) ?? [])[1])
    let chapterInfo = JSON.parse((data.match(/vm.CurChapter = (.*);/) ?? [])[1])
    let pageNum = Number(chapterInfo.Page)

    let chapter = chapterInfo.Chapter.slice(1, -1)
    let odd = chapterInfo.Chapter[chapterInfo.Chapter.length - 1]
    let chapterImage = odd == 0 ? chapter : chapter + '.' + odd

    for (let i = 0; i < pageNum; i++) {
      let s = '000' + (i + 1)
      let page = s.substr(s.length - 3)
      pages.push(`https://${pathName}/manga/${metadata.mangaId}/${chapterInfo.Directory == '' ? '' : chapterInfo.Directory + '/'}${chapterImage}-${page}.png`)
    }

    let chapterDetails = createChapterDetails({
      id: metadata.chapterId,
      mangaId: metadata.mangaId,
      pages, longStrip: false
    })

    return chapterDetails
  }

  filterUpdatedMangaRequest(ids: any, time: Date): Request {
    let metadata = { 'ids': ids, 'referenceTime': time }
    return createRequestObject({
      url: `${MK_DOMAIN}/`,
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      method: "GET"
    })
  }

  filterUpdatedManga(data: any, metadata: any): MangaUpdates {
    let $ = this.cheerio.load(data)

    // Because this source parses JSON, there is never any additional pages to parse
    let returnObject: MangaUpdates = {
      'ids': []
    }
    let updateManga = JSON.parse((data.match(/vm.LatestJSON = (.*);/) ?? [])[1])
    updateManga.forEach((elem: any) => {
      if (metadata.ids.includes(elem.IndexName) && metadata.referenceTime < new Date(elem.Date)) returnObject.ids.push(elem.IndexName)
    })

    return createMangaUpdates(returnObject)
  }

  searchRequest(query: SearchRequest): Request | null {
    let status = ""
    switch (query.status) {
      case 0: status = 'Completed'; break
      case 1: status = 'Ongoing'; break
      default: status = ''
    }

    let genre: string[] | undefined = query.includeGenre ?
      (query.includeDemographic ? query.includeGenre.concat(query.includeDemographic) : query.includeGenre) :
      query.includeDemographic
    let genreNo: string[] | undefined = query.excludeGenre ?
      (query.excludeDemographic ? query.excludeGenre.concat(query.excludeDemographic) : query.excludeGenre) :
      query.excludeDemographic

    let metadata: any = {
      'keyword': query.title,
      'author': query.author || query.artist || '',
      'status': status,
      'type': query.includeFormat,
      'genre': genre,
      'genreNo': genreNo
    }
    
    return createRequestObject({
      url: `${MK_DOMAIN}/search/story/`,
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      method: "GET"
    })
  }

  search(data: any, metadata: any): PagedResults | null {
    let $ = this.cheerio.load(data)
    let mangaTiles: MangaTile[] = []
    let directory = JSON.parse((data.match(/vm.Directory = (.*);/) ?? [])[1])

    let imgSource = ($('.img-fluid').first().attr('src')?.match(/(.*cover)/) ?? [])[1];
    if (imgSource !== MK_IMAGE_DOMAIN)
      MK_IMAGE_DOMAIN = imgSource;

    directory.forEach((elem: any) => {
      let mKeyword: boolean = typeof metadata.keyword !== 'undefined' ? false : true
      let mAuthor: boolean = metadata.author !== '' ? false : true
      let mStatus: boolean = metadata.status !== '' ? false : true
      let mType: boolean = typeof metadata.type !== 'undefined' && metadata.type.length > 0 ? false : true
      let mGenre: boolean = typeof metadata.genre !== 'undefined' && metadata.genre.length > 0 ? false : true
      let mGenreNo: boolean = typeof metadata.genreNo !== 'undefined' ? true : false

      if (!mKeyword) {
        let allWords: string[] = [elem.s.toLowerCase()].concat(elem.al.map((e: string) => e.toLowerCase()))
        allWords.forEach((key: string) => {
          if (key.includes(metadata.keyword.toLowerCase())) mKeyword = true
        })
      }

      if (!mAuthor) {
        let authors: string[] = elem.a.map((e: string) => e.toLowerCase())
        if (authors.includes(metadata.author.toLowerCase())) mAuthor = true
      }

      if (!mStatus) {
        if ((elem.ss == 'Ongoing' && metadata.status == 'Ongoing') || (elem.ss != 'Ongoing' && metadata.ss != 'Ongoing')) mStatus = true
      }

      if (!mType) mType = metadata.type.includes(elem.t)
      if (!mGenre) mGenre = metadata.genre.every((i: string) => elem.g.includes(i))
      if (mGenreNo) mGenreNo = metadata.genreNo.every((i: string) => elem.g.includes(i))

      if (mKeyword && mAuthor && mStatus && mType && mGenre && !mGenreNo) {
        mangaTiles.push(createMangaTile({
          id: elem.i,
          title: createIconText({ text: elem.s }),
          image: `${MK_IMAGE_DOMAIN}/${elem.i}.jpg`,
          subtitleText: createIconText({ text: elem.ss })
        }))
      }
    })

    // Because this parses JSON, there is never any additional search requests to create
    return createPagedResults({
      results: mangaTiles
    })
  }

  getTagsRequest(): Request | null {
    return createRequestObject({
      url: `${MK_DOMAIN}/search/`,
      method: 'GET',
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      }
    })
  }

  getTags(data: any): TagSection[] | null {
    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
    createTagSection({ id: '1', label: 'format', tags: [] })]
    let genres = JSON.parse((data.match(/"Genre"\s*: (.*)/) ?? [])[1].replace(/'/g, "\""))
    let typesHTML = (data.match(/"Type"\s*: (.*),/g) ?? [])[1]
    let types = JSON.parse((typesHTML.match(/(\[.*\])/) ?? [])[1].replace(/'/g, "\""))
    tagSections[0].tags = genres.map((e: any) => createTag({ id: e, label: e }))
    tagSections[1].tags = types.map((e: any) => createTag({ id: e, label: e }))
    return tagSections
  }

  private constructGetViewMoreRequest(key: string, page: number) {
    let metadata = { page: page }
    let param = ''
    switch (key) {
      case 'latest_updates': {
        param = `manga_list?type=latest&category=all&state=all&page=${metadata.page}`
        break
      }
      default: return undefined
    }

    return createRequestObject({
      url: `${MK_DOMAIN}`,
      method: 'GET',
      param: param,
      metadata: {
        key, page
      }
    })
  }

  getHomePageSectionRequest(): HomeSectionRequest[] | null {
    let request = createRequestObject({ url: `${MK_DOMAIN}`, method: 'GET', })
    let section1 = createHomeSection({ id: 'top_week', title: 'POPULAR MANGA' })
    let section2 = createHomeSection({ id: 'latest_updates', title: 'LATEST MANGA RELEASES', view_more: this.constructGetViewMoreRequest('latest_updates', 1) })
    return [createHomeSectionRequest({ request: request, sections: [section1, section2] })]
  }

  getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] {
    let $ = this.cheerio.load(data)
    let topManga: MangaTile[] = []
    let updateManga: MangaTile[] = []

    for (let item of $('.item', '.owl-carousel').toArray()) {
      let id = $('a', item).first().attr('href')?.split('/').pop() ?? ''
      let image = $('img', item).attr('src') ?? ''
      let title = $('div.slide-caption', item).first().first().text()
      let subtitle = $('div.slide-caption', item).last().text()
      topManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subtitle })
      }))
    }

    for (let item of $('.first', '.doreamon').toArray()) {
      let id = $('a', item).first().attr('href')?.split('/').pop() ?? ''
      let image = $('img', item).attr('src') ?? ''
      let latestUpdate = $('.sts_1', item).first()
      updateManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: $('a', item).first().text() }),
        subtitleText: createIconText({ text: $('.item-author', item).text() }),
        primaryText: createIconText({ text: $('.genres-item-rate', item).text(), icon: 'star.fill' }),
        secondaryText: createIconText({ text: $('i', latestUpdate).text(), icon: 'clock.fill' })
      }))
    }

    sections[0].items = topManga
    sections[1].items = updateManga
    return sections
  }


  getViewMoreRequest(key: string): Request | undefined {
    let metadata = { page: 1 }
    let param = ''
    switch (key) {
      case 'latest_updates': {
        param = `manga_list?type=latest&category=all&state=all&page=${metadata.page}`
        break
      }
      default: return undefined
    }

    return createRequestObject({
      url: `${MK_DOMAIN}`,
      method: 'GET',
      param: param,
      metadata: metadata
    })
  }

  getViewMoreItems(data: any, key: string, metadata: any): PagedResults | null {
    let $ = this.cheerio.load(data)
    let manga: MangaTile[] = []
    if (key == 'latest_updates') {
      let panel = $('.truyen-list')
      for (let item of $('.list-truyen-item-wrap', panel).toArray()) {
        let id = $('a', item).first().attr('href')?.split('/').pop() ?? ''
        let image = $('img', item).first().attr('src') ?? ''
        let title = $('a', item).first().attr('title') ?? ''
        let subtitle = $('.list-story-item-wrap-chapter', item).attr('title') ?? ''
        manga.push(createMangaTile({
          id: id,
          image: image,
          title: createIconText({ text: title }),
          subtitleText: createIconText({ text: subtitle })
        }))
      }
    }
    else return null

    let nextPage: Request | undefined = undefined
    console.log(!this.isLastPage($));
    if (!this.isLastPage($)) {
      metadata.page = metadata.page++;
      let param = ''
      switch (key) {
        case 'latest_updates': {
          param = `manga_list?type=latest&category=all&state=all&page=${metadata.page}`
          break
        }
        default: return null
      }
      nextPage = {
        url: `${MK_DOMAIN}`,
        method: 'GET',
        param: param,
        metadata: metadata
      }
      console.log(nextPage.url);
      console.log(nextPage.method);
      console.log(nextPage.param);
    }

    return createPagedResults({
      results: manga,
      nextPage: nextPage
    });
  }

  private isLastPage($: CheerioStatic): boolean {
    let current = $('.page-select').text();
    let total = $('.page-last').text();

    if (current) {
      total = (/(\d+)/g.exec(total) ?? [''])[0]
      return (+total) === (+current)
    }

    return true
  }
}