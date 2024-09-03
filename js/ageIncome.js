document.addEventListener('DOMContentLoaded', function () {
    fetch('data/careers.json')
        .then(response => response.json())
        .then(data => {
            const ageIncomeCtx = document.getElementById('ageIncomeChart').getContext('2d');
            const averageIncomeByAge = {};

            // データから平均年収を計算
            data.careers.forEach(career => {
                career.income.forEach(entry => {
                    if (!averageIncomeByAge[entry.age]) {
                        averageIncomeByAge[entry.age] = { totalIncome: 0, count: 0 };
                    }
                    averageIncomeByAge[entry.age].totalIncome += entry.income;
                    averageIncomeByAge[entry.age].count += 1;
                });
            });

            const labels = Object.keys(averageIncomeByAge).sort((a, b) => a - b);
            const averageIncomes = labels.map(age => averageIncomeByAge[age].totalIncome / averageIncomeByAge[age].count);

            const averageIncomeData = {
                labels: labels.map(age => `${age}歳`),
                datasets: [{
                    label: '平均年収',
                    data: averageIncomes,
                    fill: false,
                    borderColor: '#574637',
                    backgroundColor: '#574637',
                    tension: 0.1
                }]
            };

            const ageIncomeChart = new Chart(ageIncomeCtx, {
                type: 'line',
                data: averageIncomeData,
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
                            title: {
                                display: true,
                                text: '年収 (万円)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '年齢'
                            }
                        }
                    }
                }
            });
        });
});