function generateCareerTags(story) {
    const tags = [];

    addAgeTag(tags, story);
    //addJobCategoryTag(tags, story);
    addCareerTypeTag(tags, story);

    return [...new Set(tags)].slice(0, 2);
}

function addAgeTag(tags, story) {
    const age = getAge(story);
    if (!age) return;

    if (age < 25) tags.push('20代前半');
    else if (age < 30) tags.push('20代後半');
    else if (age < 35) tags.push('30代前半');
    else if (age < 40) tags.push('30代後半');
    else if (age < 45) tags.push('40代前半');
    else if (age < 50) tags.push('40代後半');
    else if (age < 55) tags.push('50代前半');
}

function getAge(story) {
    const currentYear = new Date().getFullYear();

    if (story.birthYear) {
        return currentYear - Number(story.birthYear);
    }

    if (story.birthdate) {
        return currentYear - Number(String(story.birthdate).slice(0, 4));
    }

    return null;
}

function addJobCategoryTag(tags, story) {
    const latestJob = getLatestJob(story);
    const category = story.job_category || latestJob?.job_category || story.profession;

    if (!category) return;

    if (category.includes('営業')) tags.push('営業');
    else if (category.includes('ITエンジニア')) tags.push('ITエンジニア');
    else if (category.includes('マーケティング')) tags.push('マーケティング');
    else if (category.includes('経営・企画')) tags.push('経営・企画');
    else if (category.includes('コンサルタント')) tags.push('コンサル');
    else if (category.includes('管理・事務')) tags.push('管理・事務');
    else if (category.includes('クリエイティブ')) tags.push('クリエイティブ');
    else if (category.includes('金融')) tags.push('金融専門職');
    else if (category.includes('メディカル')) tags.push('メディカル');
    else if (category.includes('不動産')) tags.push('不動産');
    else if (category.includes('機械・電気')) tags.push('技術職');
    else if (category.includes('化学・薬品・食品')) tags.push('技術職');
    else if (category.includes('建築・土木・設備')) tags.push('技術職');
    else if (category.includes('サービス・小売')) tags.push('サービス職');
}

function addIndustryChangeTag(tags, story) {
    const jobs = story.job_experiences || story.jobs || [];
    if (!jobs || jobs.length < 2) return;

    const first = jobs[0]?.industry;
    const latest = jobs[jobs.length - 1]?.industry;

    if (!first || !latest || first === latest) return;

    const latestShort = shortenIndustry(latest);
    tags.push(`${latestShort}へ転職`);
}

function shortenIndustry(industry) {
    if (industry.includes('IT・通信')) return 'IT';
    if (industry.includes('コンサルティング')) return 'コンサル';
    if (industry.includes('マスコミ・広告')) return '広告';
    if (industry.includes('メーカー')) return 'メーカー';
    if (industry.includes('金融')) return '金融';
    if (industry.includes('メディカル')) return 'メディカル';
    if (industry.includes('生活インフラ')) return 'インフラ';
    if (industry.includes('サービス')) return 'サービス';
    if (industry.includes('行政機関')) return '公共';
    return industry;
}

function addCareerTypeTag(tags, story) {
    const type = story.career_type || '';
    if (!type) return;

    if (type.includes('給与') || type.includes('収入UP')) tags.push('年収UP志向');
    else if (type.includes('安定収入')) tags.push('安定志向');
    else if (type.includes('ワークライフバランス')) tags.push('働き方重視');
    else if (type.includes('フレックス')) tags.push('柔軟な働き方');
    else if (type.includes('人間関係')) tags.push('人間関係重視');
    else if (type.includes('海外')) tags.push('海外志向');
    else if (type.includes('専門技術')) tags.push('専門性UP');
    else if (type.includes('マネジメント')) tags.push('マネジメント志向');
    else if (type.includes('起業')) tags.push('起業志向');
    else if (type.includes('社会的意義')) tags.push('社会貢献志向');
}

function addTransitionTag(tags, story) {
    const transitionType = story.transition_type || '';

    if (transitionType === '転職') tags.push('転職経験あり');
    else if (transitionType === '異動') tags.push('社内異動経験あり');
    else if (transitionType === '昇進') tags.push('昇進経験あり');
}

function getLatestJob(story) {
    const jobs = story.job_experiences || story.jobs || [];
    if (!jobs.length) return null;
    return jobs[jobs.length - 1];
}