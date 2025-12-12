let personalizedList = [];

// Check if user is logged in
auth.onAuthStateChanged(user => {
    if(user){
        document.getElementById("userName").innerText = user.email;

        // Load last 10 searches (Search History)
        db.collection("users").doc(user.uid).collection("history")
        .orderBy("timestamp","desc").limit(10)
        .get().then(snapshot=>{
            const historyDiv = document.getElementById("history");
            if(snapshot.empty) historyDiv.innerHTML = "<p>No history found.</p>";
            else{
                let html = "<ul>";
                snapshot.forEach(doc=>{
                    const data = doc.data();
                    html += `<li>${data.type} → ${data.value} (${new Date(data.timestamp.seconds*1000).toLocaleString()})</li>`;
                });
                html += "</ul>";
                historyDiv.innerHTML = html;
            }
        });

        // Load last search for personalized recommendations
        db.collection("users").doc(user.uid).collection("history")
        .orderBy("timestamp","desc").limit(1)
        .get().then(snapshot=>{
            if(snapshot.empty){
                document.getElementById("personalized").innerHTML = "<p>No recommendations yet.</p>";
            } else {
                snapshot.forEach(doc=>{
                    const lastSearch = doc.data();
                    fetch("jobs.json")
                    .then(res=>res.json())
                    .then(data=>{
                        personalizedList = data[lastSearch.type][lastSearch.value] || [];
                        populateFilters(personalizedList);
                        displayPersonalized(personalizedList);
                    });
                });
            }
        });
    } else {
        document.getElementById("userName").innerText = "Guest";
        document.getElementById("history").innerHTML = "<p>Please login to see history.</p>";
        document.getElementById("personalized").innerHTML = "<p>Please login to see recommendations.</p>";
    }
});

// Populate skill and salary/capital dropdowns
function populateFilters(list){
    const skillFilter = document.getElementById("skillFilter");
    const salaryFilter = document.getElementById("salaryFilter");

    let skillsSet = new Set();
    let salarySet = new Set();

    list.forEach(item=>{
        if(typeof item !== "string"){
            if(item.skills) item.skills.forEach(skill => skillsSet.add(skill));
            if(item.salary) salarySet.add(item.salary);
            if(item.capital) salarySet.add(item.capital);
        }
    });

    skillFilter.innerHTML = `<option value="">-- All Skills --</option>` + 
        Array.from(skillsSet).map(s => `<option value="${s}">${s}</option>`).join("");

    salaryFilter.innerHTML = `<option value="">-- All --</option>` + 
        Array.from(salarySet).map(v => `<option value="${v}">${v}</option>`).join("");

    // Add event listeners
    skillFilter.addEventListener("change", filterPersonalized);
    salaryFilter.addEventListener("change", filterPersonalized);
}

// Display personalized list
function displayPersonalized(list){
    const container = document.getElementById("personalized");
    if(list.length === 0) container.innerHTML = "<p>No recommendations found.</p>";
    else{
        let html = "<div>";
        list.forEach(item=>{
            if(typeof item === "string"){
                html += `<div class="card">${item}</div>`;
            } else {
                html += `<div class="card">
                            <strong>${item.title}</strong>
                            <p>Skills: ${item.skills.join(", ")}</p>
                            <p>Salary: ${item.salary || 'N/A'}</p>
                            <p>Capital: ${item.capital || 'N/A'}</p>
                            <p>Duration: ${item.duration || 'N/A'}</p>
                            <button onclick="bookmark('${item.title}')">Bookmark</button>
                            <button onclick="downloadCard('${item.title}')">Download</button>
                         </div>`;
            }
        });
        html += "</div>";
        container.innerHTML = html;
    }
}

// Filter personalized recommendations
function filterPersonalized(){
    const skillValue = document.getElementById("skillFilter").value;
    const salaryValue = document.getElementById("salaryFilter").value;

    const filtered = personalizedList.filter(item=>{
        let matchSkill = true;
        if(skillValue && typeof item !== "string" && item.skills){
            matchSkill = item.skills.includes(skillValue);
        }

        let matchSalary = true;
        if(salaryValue && typeof item !== "string"){
            matchSalary = (item.salary === salaryValue || item.capital === salaryValue);
        }

        return matchSkill && matchSalary;
    });

    displayPersonalized(filtered);
}

// Bookmark function
function bookmark(title){
    const user = auth.currentUser;
    if(user){
        db.collection("users").doc(user.uid).collection("bookmarks").add({
            title: title,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Bookmarked!");
    } else alert("Please login to bookmark.");
}

// Download function
function downloadCard(title){
    const card = personalizedList.find(item => item.title === title);
    if(card){
        const content = `
Title: ${card.title}
Skills: ${card.skills ? card.skills.join(", ") : 'N/A'}
Salary: ${card.salary || 'N/A'}
Capital: ${card.capital || 'N/A'}
Duration: ${card.duration || 'N/A'}
        `;
        const blob = new Blob([content], {type: "text/plain"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
