document.addEventListener('DOMContentLoaded', function () {
    fetch('data/careers.json')
        .then(response => response.json())
        .then(data => {
            const companyIncomeCtx = document.getElementById('companyIncomeChart').getContext('2d');
            const companyExperienceIncome = [];

            // データから経験会社数ごとの年収を取得
            data.careers.forEach(career => {
                const companyCount = career.companies.length;
                const latestIncome = career.income[career.income.length - 1].income;
                companyExperienceIncome.push({
                    x: companyCount,
                    y: latestIncome
                });
            });

            const companyIncomeChart = new Chart(companyIncomeCtx, {
                type: 'scatter', // プロット図に設定
                data: {
                    datasets: [{
                        label: '年収 (万円)',
                        data: companyExperienceIncome,
                        backgroundColor: '#8ba141',
                        borderColor: '#574637',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            suggestedMax: 900, // 縦軸の範囲を調整
                            title: {
                                display: true,
                                text: '年収 (万円)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '経験会社数'
                            },
                            ticks: {
                                precision: 0 // 整数のみを表示
                            }
                        }
                    }
                }
            });
        });
});