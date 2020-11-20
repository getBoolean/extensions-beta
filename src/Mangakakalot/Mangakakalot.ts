import { /*Source,*/ Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, MangaUpdates, PagedResults, SourceTag, TagType } from "paperback-extensions-common"
import { Manganelo } from '../Manganelo'

const MK_DOMAIN = 'https://mangakakalot.com'
const MN_DOMAIN = 'https://manganelo.com'
let MN_IMAGE_DOMAIN = 'https://avt.mkklcdnv6.com/'
let MK_IMAGE_DOMAIN = 'https://s5.mkklcdnv5.com/'

export class Mangakakalot extends Manganelo {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  // @getBoolean
  get version(): string { return '0.1.18'; }
  get name(): string { return 'Mangakakalot' }
  get icon(): string { return 'mangakakalot.com.ico' }
  get author(): string { return 'getBoolean' }
  get authorWebsite(): string { return 'https://github.com/getBoolean' }
  get language(): string { return 'English' }
  get description(): string { return 'Extension that pulls manga from Mangakakalot' }
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { 
    /*if ( mangaId.includes('read-')) {
      //console.log(`${MK_DOMAIN}/${mangaId}`)
      return `${MK_DOMAIN}/${mangaId}`
    }
    return `${MK_DOMAIN}/manga/${mangaId}`*/
    return `${mangaId}/`
  }
  get websiteBaseURL(): string { return MK_DOMAIN }
  get rateLimit(): number {
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

  // Done @getBoolean
  getMangaDetailsRequest(ids: string[]): Request[] {
    let requests: Request[] = []
    for (let id of ids) {
      let idTemp = id.slice( id.indexOf( '/', id.indexOf('/') + 2 ), id.length )
      let urlDomain = id.replace(idTemp, '')
      let metadata = { 
        'id': id,
        'url': urlDomain,
        'idTemp': idTemp
      }
      
      requests.push(createRequestObject({
        url: `${urlDomain}/`,
        //url: `${MK_DOMAIN}/manga/`,
        metadata: metadata,
        method: 'GET',
        param: idTemp
      }))
    }
    return requests
  }

  // Done @getBoolean
  getMangaDetails(data: any, metadata: any): Manga[] {
    let manga: Manga[] = []
    if (metadata.id.toLowerCase().includes('mangakakalot')) {
      manga = this.parseMangakakalotMangaDetails(data, metadata)
    }
    else { // metadata.id.toLowerCase().includes('manganelo')
      manga = super.getMangaDetails(data, metadata)
    }

    return manga
  }

  // Done @getBoolean
  parseMangakakalotMangaDetails(data: any, metadata: any): Manga[] {
    //console.log('Inside parseMangakakalotMangaDetails()')
    let manga: Manga[] = []
    let $ = this.cheerio.load(data)
    let panel = $('.manga-info-top')
    let title = $('h1', panel).first().text() ?? ''
    let image = $('.manga-info-pic', panel).children().first().attr('src') ?? ''
    let table = $('.manga-info-text', panel)
    let author = '' // Updated below
    let artist = '' // Updated below
    let autart = $('.manga-info-text li:nth-child(2)').text().replace('Author(s) :', '').replace(/\r?\n|\r/g, '').split(', ')
    autart[autart.length-1] = autart[autart.length-1]?.replace(', ', '')
    author = autart[0]
    if (autart.length > 1 && $(autart[1]).text() != ' ') {
      artist = autart[1]
    }
    let rating = Number($('#rate_row_cmd', table).text().replace('Mangakakalot.com rate : ', '').slice($('#rate_row_cmd', table).text().indexOf('Mangakakalot.com rate : '), $('#rate_row_cmd', table).text().indexOf(' / 5')) )
    let status = $('.manga-info-text li:nth-child(3)').text().split(' ').pop() == 'Ongoing' ? MangaStatus.ONGOING : MangaStatus.COMPLETED
    let titles = [title]
    let follows = Number($('#rate_row_cmd', table).text().replace(' votes', '').split(' ').pop() )
    let views = Number($('.manga-info-text li:nth-child(6)').text().replace(/,/g, '').replace('View : ', '') )
    let lastUpdate = '' // Updated below
    let hentai = false

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] })]

    // Genres
    let elems = $('.manga-info-text li:nth-child(7)').find('a').toArray()
    for (let elem of elems) {
      let text = $(elem).text()
      let id = $(elem).attr('href')?.split('/').pop()?.split('&')[1].replace('category=', '') ?? ''
      if (text.toLowerCase().includes('smut')) {
        hentai = true
      }
      tagSections[0].tags.push(createTag({ id: id, label: text }))
    }

    // Date
    let time = new Date($('.manga-info-text li:nth-child(4)').text().replace(/((AM)*(PM)*)/g, '').replace('Last updated : ', '') )
    lastUpdate = time.toDateString()

    // Alt Titles
    for (let row of $('li', table).toArray()) {
      if ($(row).find('.story-alternative').length > 0) {
        let alts = $('h2', table).text().replace('Alternative : ','').split(/,|;/)
        for (let alt of alts) {
          titles.push(alt.trim())
        }
      }
    }

    
    // Exclude child text: https://www.viralpatel.net/jquery-get-text-element-without-child-element/
    // Remove line breaks from start and end: https://stackoverflow.com/questions/14572413/remove-line-breaks-from-start-and-end-of-string
    let summary = $('#noidungm', $('.leftCol'))
                    .clone()    //clone the element
                    .children() //select all the children
                    .remove()   //remove all the children
                    .end()  //again go back to selected element
                    .text().replace(/^\s+|\s+$/g, '')
    

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

  // Done @getBoolean
  getChaptersRequest(mangaId: string): Request {
    let idTemp = mangaId.slice( mangaId.indexOf( '/', mangaId.indexOf('/') + 2 ), mangaId.length )
    let urlDomain = mangaId.replace(idTemp, '')
    let metadata = {
      'url': urlDomain, // https://mangakakalot.com
      'id': mangaId,    // https://mangakakalot.com/read-oo1zd158524527909
      'idTemp': idTemp  // /read-oo1zd158524527909
    }

    return createRequestObject({
      url: `${urlDomain}/`,
      metadata: metadata,
      method: 'GET',
      param: idTemp
   })
  }

  // Done @getBoolean
  getChapters(data: any, metadata: any): Chapter[] {
    let chapters: Chapter[] = []
    if (metadata.id.toLowerCase().includes('mangakakalot')) {
      chapters = this.getMangakakalotChapters(data, metadata)
    }
    else { // metadata.id.toLowerCase().includes('manganelo')
      chapters = super.getChapters(data, metadata)
    }

    return chapters
  }

  // Done @getBoolean
  getMangakakalotChapters(data: any, metadata: any): Chapter[] {
    let $ = this.cheerio.load(data)
    let allChapters = $('.chapter-list', '.leftCol')
    let chapters: Chapter[] = []

    // volume is commented out because it doesn't sort properly.
    for (let chapter of $('.row', allChapters).toArray()) {
      let id: string = $('a', chapter).attr('href') ?? ''
      let text: string = $('a', chapter).text() ?? ''
      let chNum = Number( id.split('_').pop() )
      //let volume = Number ( text.includes('Vol.') ? text.slice( text.indexOf('Vol.') + 4, text.indexOf(' ')) : '')
      let name: string = text //text.includes(': ') ? text.slice(text.indexOf(': ') + 2, text.length) : ''
      
      let time = Date.parse($('span:nth-child(3)', chapter).attr('title') ?? '')
      chapters.push(createChapter({
        id: id,
        mangaId: metadata.id,
        name: name,
        langCode: LanguageCode.ENGLISH,
        chapNum: chNum,
        //volume: Number.isNaN(volume) ? 0 : volume,
        time: isNaN(time) ? new Date() : new Date(time)
      }))
    }
    
    return chapters
  }

  // Need to add headers
  // TODO @getBoolean
  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    console.log('in getChapterDetailsRequest()')
    let mangaIdTemp = mangaId.slice( mangaId.indexOf( '/', mangaId.indexOf('/') + 2 ), mangaId.length )
    let mangaCode = chapId.slice( chapId.indexOf('chapter/') + 8, chapId.indexOf('/chapter_'))
    let urlDomain = mangaId.replace(mangaIdTemp, '')
    let tempChapId = chapId.split('/').pop() ?? chapId
    let metadata = {
      'mangaId': mangaId,
      'chapterId': tempChapId,
      'chapterId': chapId, // chapId is the full URL
      'nextPage': false,
      'page': 1
    }
    console.log('url: ' + `${urlDomain}/chapter/`)
    console.log('param: ' + `${mangaCode}/${tempChapId}`)

    return createRequestObject({ 
      //url: `${urlDomain}/chapter/`,
      url: `${chapId}`,
      method: "GET",
      metadata: metadata/*,
      headers: {
        'Referer': 'https://mangakakalot.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36'
      }*///,
      //param: `${mangaCode}/${tempChapId}`
    })
  }

  // TODO @getBoolean
  getChapterDetails(data: any, metadata: any): ChapterDetails {
    console.log('Inside getChapterDetails()')
    //let chapterDetails : ChapterDetails
    console.log('metadata.mangaId: ' + metadata.mangaId)
    if (metadata.mangaId.toLowerCase().includes('mangakakalot')) {
      console.log('Entering this.getMangakakalotChapterDetails()')
      // chapterDetails = this.getMangakakalotChapterDetails(data, metadata)
      return this.getMangakakalotChapterDetails(data, metadata)
    }
    else { // metadata.mangaId.toLowerCase().includes('manganelo')
      console.log('Entering super.getChapterDetails()')
      // chapterDetails = super.getChapterDetails(data, metadata)
      return super.getChapterDetails(data, metadata)
    }

    //return chapterDetails
  }

  // TODO @getBoolean
  getMangakakalotChapterDetails(data: any, metadata: any): ChapterDetails {
//  getChapterDetails(data: any, metadata: any): ChapterDetails {
    console.log('In getMangakakalotChapterDetails()')
    let $ = this.cheerio.load(data)
    let pages: string[] = []
    for (let item of $('img', '.vung-doc').toArray()) {
      let imageUrl = $(item).attr('src') ?? ''
      pages.push(imageUrl)
      console.log('Pushing image url: ' + imageUrl)
    }

    //let chapterDetails = createChapterDetails({
    return createChapterDetails({
      id: metadata.chapterId,
      mangaId: metadata.mangaId,
      pages: pages,
      longStrip: false
    })

    //return chapterDetails
  }
/*
  // TODO: @getBoolean
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

  // TODO: @getBoolean
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
*/
  // TODO: @getBoolean
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

  // TODO: @getBoolean
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

  // TODO: @getBoolean
  getTagsRequest(): Request | null {
    return createRequestObject({
      url: `${MK_DOMAIN}/search/`,
      method: 'GET',
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      }
    })
  }

  // TODO: @getBoolean
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

  // Done @getBoolean
  constructGetViewMoreRequest(key: string, page: number) {
    let metadata = { page: page }
    let param = ''
    if (key == 'latest_updates') {
      param = `/manga_list?type=latest&category=all&state=all&page=${metadata.page}`
    }
    else{
      return undefined
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

  // Done
  getHomePageSectionRequest(): HomeSectionRequest[] | null {
    let request = createRequestObject({ url: `${MK_DOMAIN}`, method: 'GET', })
    let section1 = createHomeSection({ id: 'top_week', title: 'POPULAR MANGA' })
    let section2 = createHomeSection({ id: 'latest_updates', title: 'LATEST MANGA RELEASES', view_more: this.constructGetViewMoreRequest('latest_updates', 1) })
    return [createHomeSectionRequest({ request: request, sections: [section1, section2] })]
  }

  // Done
  getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] {
    let $ = this.cheerio.load(data)
    let topManga: MangaTile[] = []
    let updateManga: MangaTile[] = []

    for (let item of $('.item', '.owl-carousel').toArray()) {
      let url = $('a', item).first().attr('href') ?? ''
      //let id = url.slice( url.indexOf( '/', url.indexOf('/') + 2 ), url.length )
      //let domain = url.replace(id, '')
      // Redundant
      /*let id = $('div.slide-caption', item).children().last().attr('href')?.slice( $('div.slide-caption', item).children().last().attr('href')?.indexOf('chapter/'), $('div.slide-caption', item).children().last().attr('href')?.indexOf('/chapter_')).split('/').pop() ?? ''
      if (id2 != id)
        id = id2*/

      let image = $('img', item).attr('src') ?? ''
      let title = $('div.slide-caption', item).children().first().text()
      let subtitle = $('div.slide-caption', item).children().last().text()
      topManga.push(createMangaTile({
        //id: id,
        id: url,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subtitle })
      }))
    }

    for (let item of $('.first', '.doreamon').toArray()) {
      //let id = $('a', item).first().attr('href')?.split('/').pop() ?? ''
      let url = $('a', item).first().attr('href') ?? ''
      let image = $('img', item).attr('src') ?? ''
      //let secondaryText = $('li:nth-child(2) > i', item).text() ?? ''

      updateManga.push(createMangaTile({
        //id: id,
        id: url,
        image: image,
        title: createIconText({ text: $('h3', item).text() }),
        subtitleText: createIconText({ text: $('.sts_1', item).first().text() }),
        //primaryText: createIconText({ text: '', icon: 'star.fill' }),
        //secondaryText: createIconText({ text: '', icon: 'clock.fill' })
      }))
    }

    sections[0].items = topManga
    sections[1].items = updateManga
    return sections
  }


  // TODO: @getBoolean
  getViewMoreRequest(key: string): Request | undefined {
    let metadata = { page: 1 }
    let param = ''
    if (key == 'latest_updates') {
      param = `/manga_list?type=latest&category=all&state=all&page=${metadata.page}`
    }
    else {
      return undefined
    }

    return createRequestObject({
      url: `${MK_DOMAIN}`,
      method: 'GET',
      param: param,
      metadata: metadata
    })
  }

  // TODO: @getBoolean
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
      if (key == 'latest_updates') {
        param = `manga_list?type=latest&category=all&state=all&page=${metadata.page}`
      }
      else {
        return null
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

  /**
   * Manganelo image requests for older chapters and pages are required to have a referer to it's host
   * @param request
   */
  requestModifier(request: Request): Request {

    let headers: any = request.headers == undefined ? {} : request.headers
    headers['Referer'] = `${MK_DOMAIN}`

    return createRequestObject({
      url: request.url,
      method: request.method,
      headers: headers,
      data: request.data,
      metadata: request.metadata,
      timeout: request.timeout,
      param: request.param,
      cookies: request.cookies,
      incognito: request.incognito
    })
  }



  

  isLastPage($: CheerioStatic): boolean {
    let current = $('.page_select').text();
    let total = $('.page_last').text();

    if (current) {
      total = (/(\d+)/g.exec(total) ?? [''])[0]
      return (+total) === (+current)
    }

    return true
  }
}