import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, MangaUpdates, PagedResults, SourceTag, TagType } from "paperback-extensions-common"

const MK_DOMAIN = 'https://mangakakalot.com'
let MK_IMAGE_DOMAIN = 'https://avt.mkklcdnv6.com/'

export class Mangakakalot extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  // @getBoolean
  get version(): string { return '0.0.27'; }
  get name(): string { return 'Mangakakalot' }
  get icon(): string { return 'mangakakalot.com.ico' }
  get author(): string { return 'getBoolean' }
  get authorWebsite(): string { return 'https://github.com/getBoolean' }
  get description(): string { return 'Extension that pulls manga from Mangakakalot' }
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { 
    if ( mangaId.includes('read-'))
      return `${MK_DOMAIN}/${mangaId}`
    return `${MK_DOMAIN}/manga/${mangaId}` 
  }
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
      let url = ''
      if ( id.includes('read-') )
        url = `${MK_DOMAIN}/`
      else
        url = `${MK_DOMAIN}/manga/`
      //console.log(url)
      //console.log(id)

      requests.push(createRequestObject({
        url: url,
        //url: `${MK_DOMAIN}/manga/`,
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
    console.log($)
    let panel = $('.manga-info-top')
    let title = $('h1', panel).first().text() ?? ''
    let image = $('.manga-info-pic', panel).children().first().attr('src') ?? ''
    let table = $('.manga-info-text', panel)
    let author = ''
    let artist = ''
    let autart = $('.manga-info-text li:nth-child(2)').text().replace('Author(s) :', '').split(/,  |;/)
    author = autart[0]
    if (autart.length > 1 && $(autart[1]).text() != ' ') {
      artist = autart[1]
    }
    let rating = 0
    let status = MangaStatus.ONGOING
    status = $('.manga-info-text li:nth-child(3)').text().split(' ').pop() == 'Ongoing' ? MangaStatus.ONGOING : MangaStatus.COMPLETED
    let titles = [title]
    let follows = 0
    let views = 0
    let lastUpdate = ''
    let hentai = false

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] })]

    // Genres
    let elems = $('.manga-info-text li:nth-child(7)').find('a').toArray()
    for (let elem of elems) {
      let text = $(elem).text()
      let id = ''// $(elem).attr('href')?.split('/').pop().split('&')[1].replace('category=', '') ?? ''
      if (text.toLowerCase().includes('smut')) {
        hentai = true
      }
      tagSections[0].tags.push(createTag({ id: id, label: text }))
    }

    // Date
    let time = new Date($('.manga-info-text li:nth-child(4)').text().replace(/(-*(AM)*(PM)*)/g, '').replace('Last updated : ', '') )
    lastUpdate = time.toDateString()

    // Views
    views = Number($('.manga-info-text li:nth-child(6)').text().replace(/,/g, '').replace('View : ', '') )

    // Alt Titles
    for (let row of $('li', table).toArray()) {
      if ($(row).find('.story-alternative').length > 0) {
        let alts = $('h2', table).text().replace('Alternative : ','').split(/,|;/)
        for (let alt of alts) {
          titles.push(alt.trim())
        }
      }
      /*else if ($(row).find('.manga-info-text li:nth-child(2)').length > 0) {
        
      }*/
      /*else if ($(row).find('.manga-info-text li:nth-child(3)').length > 0) {
        
      }*/
      /*else if ($(row).find('.manga-info-text li:nth-child(7)').find('a').length > 0) {
        
      }*/
      /*else if ($(row).find('.manga-info-text li:nth-child(4)').length > 0) {
        
      }*/
      /*else if ($(row).find('.manga-info-text li:nth-child(6)').length > 0) {
        
      }*/
    }

    /*
    table = $('.story-info-right-extent', panel)
    for (let row of $('p', table).toArray()) {
      if ($(row).find('.info-time').length > 0) {
        let time = new Date($('.stre-value', row).text().replace(/(-*(AM)*(PM)*)/g, ''))
        lastUpdate = time.toDateString()
      }
      else if ($(row).find('.info-view').length > 0) {
        views = Number($('.stre-value', row).text().replace(/,/g, ''))
      }
    }*/

    rating = Number($('#rate_row_cmd', table).text().replace('Mangakakalot.com rate : ', '').slice($('#rate_row_cmd', table).text().indexOf('Mangakakalot.com rate : '), $('#rate_row_cmd', table).text().indexOf(' / 5')) )
    follows = Number($('#rate_row_cmd', table).text().replace(' votes', '').split(' ').pop() )
    let summary = $('#noidungm', $('.leftCol')).text()

    manga.push(createManga({
      id: metadata.id,
      titles: titles,
      image: image,
      rating: Number(rating),
      status: status,
      artist: artist,
      author: author,
      tags: tagSections,
      views: views,
      follows: follows,
      lastUpdate: lastUpdate,
      desc: summary,
      hentai: hentai
    }))

    return manga
  }

  getChaptersRequest(mangaId: string): Request {
    let metadata = { 'id': mangaId }
    let url = ''
    if ( mangaId.includes('read-') )
        url = `${MK_DOMAIN}/`
      else
        url = `${MK_DOMAIN}/manga/`
    return createRequestObject({
      url: url,
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
      let id2 = $('a', item).first().attr('href')?.split('/').pop() ?? ''
      let id = $('div.slide-caption', item).children().last().attr('href')?.slice( $('div.slide-caption', item).children().last().attr('href')?.indexOf('chapter/'), $('div.slide-caption', item).children().last().attr('href')?.indexOf('/chapter_')).split('/').pop() ?? ''
      if (id2 != id)
        id = id2

      let image = $('img', item).attr('src') ?? ''
      let title = $('div.slide-caption', item).children().first().text()
      let subtitle = $('div.slide-caption', item).children().last().text()
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