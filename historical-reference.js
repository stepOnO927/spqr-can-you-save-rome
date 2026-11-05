// Historical reference only: this catalog is never used for simulated mortality.
// Years are BCE; sources are linked per field so uncertainty can be reviewed.
export const HISTORICAL_DEATHS={
 caesar:{years:[44],sources:[{label:['Oxford Dictionary of National Biography','牛津国家传记辞典'],url:'https://academic.oup.com/oxford-dictionary-of-national-biography/reference/63486/reference-article-abstract/579736904'}]},
 pompey:{years:[48],sources:[{label:['Cambridge Museum of Classical Archaeology','剑桥古典考古博物馆'],url:'https://museum.classics.cam.ac.uk/collections/casts/pompey-gnaeus-pompeius-magnus'}]},
 cicero:{years:[43],sources:[{label:['Oxford Bibliographies','牛津古典学书目'],url:'https://academic.oup.com/reference/62365/reference-article-abstract/574486739'}]},
 labienus:{years:[45],sources:[{label:['Oxford Classical Dictionary','牛津古典辞典'],url:'https://academic.oup.com/edited-volume/61673/chapter-abstract/549655484'}]},
 cato:{years:[46],sources:[{label:['Encyclopedia of Ancient History','古代史百科全书'],url:'https://onlinelibrary.wiley.com/doi/10.1002/9781444338386.wbeah20106'}]},
 antony:{years:[30],sources:[{label:['Rosicrucian Egyptian Museum','玫瑰十字埃及博物馆'],url:'https://egyptianmuseum.org/explore/greco-and-roman-period-rulers-cleopatra-vii'}]},
 cleopatra:{years:[30],sources:[{label:['Rosicrucian Egyptian Museum','玫瑰十字埃及博物馆'],url:'https://egyptianmuseum.org/explore/greco-and-roman-period-rulers-cleopatra-vii'}]},
 orodes:{years:[38,37],disputed:true,sources:[{label:['Encyclopaedia Iranica: Orodes II','伊朗百科：奥罗德二世'],url:'https://www.iranicaonline.org/articles/orodes-ii/'},{label:['Encyclopaedia Iranica: Women in pre-Islamic Persia','伊朗百科：伊斯兰之前波斯的女性'],url:'https://www.iranicaonline.org/articles/women-i/'}]},
 lepidus:{years:[13,12],disputed:true,sources:[{label:['Encyclopedia of Ancient History','古代史百科全书'],url:'https://onlinelibrary.wiley.com/doi/10.1002/9781444338386.wbeah20004'}]},
 scipio:{years:[46],sources:[{label:['Oxford Classical Dictionary: Sittius','牛津古典辞典：西提乌斯'],url:'https://academic.oup.com/edited-volume/61673/chapter-abstract/550500711'}]},
 ptolemy:{years:[47],sources:[{label:['Trismegistos: Ptolemy XIII','Trismegistos：托勒密十三世'],url:'https://www.trismegistos.org/calendar/bennett/ptolemies/ptolemy_xiii.htm'}]},
 artavasdes:{years:[31],sources:[{label:['Encyclopaedia Iranica: Armenia','伊朗百科：亚美尼亚'],url:'https://www.iranicaonline.org/articles/armenia-ii/'}]},
 juba:{years:[46],sources:[{label:['Oxford Classical Dictionary: Juba I','牛津古典辞典：朱巴一世'],url:'https://academic.oup.com/edited-volume/61673/chapter-abstract/549669445'}]},
 bocchus:{years:[33],sources:[{label:['Oxford Classical Dictionary: Bocchus II','牛津古典辞典：博库斯二世'],url:'https://academic.oup.com/edited-volume/61673/chapter-abstract/548527004'}]},
 bogud:{years:[31],sources:[{label:['University of Barcelona: Mauretania','巴塞罗那大学：毛里塔尼亚研究'],url:'https://diposit.ub.edu/server/api/core/bitstreams/daccdffc-557e-4df4-8567-0d922c01a16b/content'}]},
 deiotarus:{years:[41,40],disputed:true,sources:[{label:['Encyclopedia of Ancient History: Deiotaros','古代史百科全书：代奥塔鲁斯'],url:'https://onlinelibrary.wiley.com/doi/abs/10.1002/9781444338386.wbeah09083.pub2'}]},
 pharnaces:{years:[47],sources:[{label:['Oxford Classical Dictionary: Pharnaces II','牛津古典辞典：法尔纳刻斯二世'],url:'https://academic.oup.com/edited-volume/61673/chapter-abstract/549705304'}]},
 pacorus:{years:[38],sources:[{label:['Encyclopaedia Iranica: Orodes II','伊朗百科：奥罗德二世'],url:'https://www.iranicaonline.org/articles/orodes-ii/'}]}
};

// Approximate birth references; uncertain single years are not converted into
// invented narrow age ranges or used as simulation thresholds.
export const HISTORICAL_BIRTH_ESTIMATES={
 caesar:{text:['100 BCE is widely used; 102 BCE has also been argued','公元前100年较常用；也有公元前102年的论说'],sources:[{label:['Oxford Dictionary of National Biography','牛津国家传记辞典'],url:'https://academic.oup.com/oxford-dictionary-of-national-biography/reference/63486/reference-article-abstract/579736904'},{label:['Journal of Roman Studies: the birth-year debate','《罗马研究杂志》：出生年份讨论'],url:'https://www.cambridge.org/core/journals/journal-of-roman-studies/article/abs/was-caesar-born-in-100-or-in-102-bc/BDE639D70E0F8A3A819F268D2E827975'}]},
 antony:{text:['83 BCE is commonly given; 82 or, less likely, 86 BCE have also been proposed','公元前83年较常见；也有公元前82年或可能性较低的前86年的说法'],sources:[{label:['Encyclopedia of Ancient History: Antony','《古代史百科全书》：安东尼'],url:'https://onlinelibrary.wiley.com/doi/abs/10.1002/9781444338386.wbeah20010'},{label:['Mark Antony: A Biography','《马尔库斯·安东尼传》'],url:'https://www.jstor.org/stable/10.5749/j.ctttsccd'},{label:['Oxford Dictionary of the Classical World','《牛津古典世界辞典》'],url:'https://api.pageplace.de/preview/DT0400.9780191016752_A23539655/preview-9780191016752_A23539655.pdf'}]},
 ptolemy:{text:['62–61 BCE (estimated)','公元前62–61年（估计）'],sources:[{label:['Trismegistos: Ptolemy XIII','Trismegistos：托勒密十三世'],url:'https://www.trismegistos.org/calendar/bennett/ptolemies/ptolemy_xiii.htm'}]},
 labienus:{text:['around 100 BCE; precision unknown','约公元前100年，误差范围不明'],sources:[{label:['Oxford Classical Dictionary','牛津古典辞典'],url:'https://academic.oup.com/edited-volume/61673/chapter-abstract/549655484'}]},
 lepidus:{text:['around 90 BCE; precision unknown','约公元前90年，误差范围不明'],sources:[{label:['Encyclopedia of Ancient History','古代史百科全书'],url:'https://onlinelibrary.wiley.com/doi/10.1002/9781444338386.wbeah20004'}]},
 juba:{text:['around 85 BCE; precision unknown','约公元前85年，误差范围不明'],sources:[{label:['Algerian Embassy: Numidian kings','阿尔及利亚大使馆：努米底亚诸王'],url:'https://ambassade-algerie.ch/exposition_culturelle/medias/encyclotimbreen.pdf'}]},
 deiotarus:{text:['around 120 BCE; precision unknown','约公元前120年，误差范围不明'],sources:[{label:['Encyclopedia of Ancient History','古代史百科全书'],url:'https://onlinelibrary.wiley.com/doi/abs/10.1002/9781444338386.wbeah09083.pub2'}]}
};

// A later coin inscription is evidence of a name form, not an authentic portrait
// or proof that the specific coin existed at the 49 BCE bookmark.
export const HISTORICAL_NAME_FORMS={
 cleopatra:{form:'ΚΛΕΟΠΑΤΡΑ',note:['Greek inscription on a coin from later in her reign','其统治后期钱币上的希腊文铭文'],source:{label:['Metropolitan Museum: Pergamon and the Hellenistic Kingdoms','大都会艺术博物馆：《帕加马与希腊化王国》'],url:'https://resources.metmuseum.org/resources/metpublications/pdf/Pergamon_and_the_Hellenistic_Kingdoms_of_the_Ancient_World.pdf'}},
 antony:{form:'ΑΝΤΩΝΙΟΣ',note:['Greek inscription on a coin from later in his life','其生平后期钱币上的希腊文铭文'],source:{label:['Metropolitan Museum: Pergamon and the Hellenistic Kingdoms','大都会艺术博物馆：《帕加马与希腊化王国》'],url:'https://resources.metmuseum.org/resources/metpublications/pdf/Pergamon_and_the_Hellenistic_Kingdoms_of_the_Ancient_World.pdf'}}
};

// Family relationships are historical references, not simulation trust, present
// authority, or evidence that a foreign court's current reports are accurate.
export const HISTORICAL_RELATIONSHIPS={
 cleopatra:[{person:'ptolemy',relation:['Younger brother and early co-ruler','弟弟及早期共同统治者'],source:{label:['Metropolitan Museum of Art: Hellenistic kingdoms','大都会艺术博物馆：希腊化王国'],url:'https://resources.metmuseum.org/resources/metpublications/pdf/Pergamon_and_the_Hellenistic_Kingdoms_of_the_Ancient_World.pdf'}}],
 ptolemy:[{person:'cleopatra',relation:['Older sister and early co-ruler','姐姐及早期共同统治者'],source:{label:['Metropolitan Museum of Art: Hellenistic kingdoms','大都会艺术博物馆：希腊化王国'],url:'https://resources.metmuseum.org/resources/metpublications/pdf/Pergamon_and_the_Hellenistic_Kingdoms_of_the_Ancient_World.pdf'}}],
 orodes:[{person:'pacorus',relation:['Son','儿子'],source:{label:['Encyclopaedia Iranica: Orodes II','《伊朗百科全书》：奥罗德二世'],url:'https://www.iranicaonline.org/articles/orodes-ii/'}}],
 pacorus:[{person:'orodes',relation:['Father','父亲'],source:{label:['Encyclopaedia Iranica: Orodes II','《伊朗百科全书》：奥罗德二世'],url:'https://www.iranicaonline.org/articles/orodes-ii/'}}]
};
