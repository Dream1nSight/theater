
// Free seat        - .seat-status-free (#lightgreen)
// In-sale mode sel - .seat-status-selected (.spectator .seat-status-selected)
// Busy seat        - .seat-status-busy
// Reserve mode sel - .seat-status-prebook
// Reserved seat    - .seat-status-book
// Refund mode sel  - .seat-status-sold

const SEATS_BASE           = 1505;
const SEATS_MAX            = 1875;
// const SEATS_COUNT          = SEATS_MAX - SEATS_BASE + 1;

const TSTATE =
{
	IDLE : 0,
	SALE : 1,
	RESERVE : 2,
	REFUND_SALE : 3,
	REFUND_RESERVE : 4,
	SALE_MENU : 5,
	RESERVE_MENU : 6
};

// const TRADE_IDLE           = 1;
// const TRADE_IN_SALE        = 2;
// const TRADE_RESERVE        = 3;
// const TRADE_REFUND_SALE    = 4;
// const TRADE_REFUND_RESERVE = 5;

const STORAGE_LISTS_KEY    = "theater-lists-data";
const STORAGE_SEATS_KEY    = 'theater-seats-data-';

const SEAT_BUSY            = 1;
const SEAT_RESERVED        = 2;

const LOCALE =
{
	Back      : "Назад",
	UseSaveAs : 'Используйте "Сохранить как" для безымянного списка',

	Sale : {
        MenuTitle : "Продажи",
        Begin     : "Начать продажу",
        Refund    : "Возврат билетов"
	},

	Reserve : {
		MenuTitle : "Бронирование",
		Begin     : "Начать бронирование",
		Refund    : "Возврат брони"
	},

	Confirm : {
		Ok        : "Подтвердить",
		Cancel    : "Отмена"
	},

	FullReset : {
        MenuTitle : "Полный сброс",
		Confirm   : "Очистить все записи?"
	},

	Lists : {
		New       : "Введите название нового списка",
		Delete    : "Удалить текущий список?",
		Rename    : "Введите новое имя для текущего списка",
		RenErr    : "Невозможно переименовать, новый список уже существует?",
		SaveAs    : "Введите название нового списка",
		Clear     : "Освободить все места в текущем списке?"

	}
};

let _TradeState = TSTATE.IDLE;
let MenuButtons, SeatsList;
let SalesCount, ReserveCount;
let TicketPrice;

window.addEventListener("load", function()
{
	MenuButtons = document.querySelectorAll(".sysctrl-menu");
    SeatsList = document.querySelector("#seats-list");

    SalesCount = ReserveCount = 0;
    TicketPrice = 150;

    let l = JSON.parse(localStorage.getItem(STORAGE_LISTS_KEY));

	loadSeatsState();

	for (let i in l)
	    loadSeatsState(i.slice(STORAGE_SEATS_KEY.length));

	refreshSeatsList(0);
});

window.UpdateSalesSum = function()
{
	document.querySelector('#sales-sum').textContent = SalesCount * TicketPrice +
		' (' + SalesCount + ' шт)';
	document.querySelector('#reserve-sum').textContent = ReserveCount * TicketPrice +
		' (' + ReserveCount + ' шт)';
	document.querySelector('#all-sum').textContent = (SalesCount + ReserveCount) * TicketPrice +
		' (' + (SalesCount + ReserveCount) + ' шт)';
};

function elt(name, attributes) {
  let node = document.createElement(name);
  if (attributes) {
    for (let attr in attributes)
      if (attributes.hasOwnProperty(attr))
        node.setAttribute(attr, attributes[attr]);
  }
  for (let i = 2; i < arguments.length; i++) {
    let child = arguments[i];
    if (typeof child === "string")
      child = document.createTextNode(child);
    node.appendChild(child);
  }
  return node;
}

function getSeatsListSelIndex()
{
	return SeatsList.selectedIndex;
}

function refreshSeatsList(sel_ix)
{
	for (let i = SeatsList.childElementCount - 1; i >= 0; i--)
		SeatsList.removeChild(SeatsList.children[0]);

	let lists = JSON.parse(localStorage.getItem(STORAGE_LISTS_KEY));

	SeatsList.appendChild(elt("option", null, ""));

	if (lists)
		for (let i in lists)
			SeatsList.appendChild(elt("option", null, i.slice(STORAGE_SEATS_KEY.length)));

	SeatsList.selectedIndex = sel_ix;
	onListsItemChange();
}

function addNewSeatsList(name)
{
	let lists = JSON.parse(localStorage.getItem(STORAGE_LISTS_KEY));

	if ( ! lists )
		lists = {};

	lists[STORAGE_SEATS_KEY + name] = 1;

	let js = JSON.stringify(lists);

	localStorage.setItem(STORAGE_LISTS_KEY, js);
}

function delSeatsFromList(name)
{
    if ( ! name )
        sessionStorage.clear();
    else
    {
        let lists = JSON.parse(localStorage.getItem(STORAGE_LISTS_KEY));

        delete lists[STORAGE_SEATS_KEY + name];

        localStorage.setItem(STORAGE_LISTS_KEY, JSON.stringify(lists));
    }
}

function renameSeatsList(name)
{
	let current_name = getCurrentListName();

	if ( ! name || ! current_name || current_name === name )
		return false;

	let lists = JSON.parse(localStorage.getItem(STORAGE_LISTS_KEY));

	if (lists[STORAGE_SEATS_KEY + name] === 1)
		return false;

	saveSeatsState(name);
	addNewSeatsList(name);
	delSeatsFromList(current_name);

	return true;
}

function clearAllSeats()
{
	let seats = document.querySelectorAll(".hb-seat");

	SalesCount = ReserveCount = 0;

	for (let i = seats.length - 1; i >= 0; i--)
		seats[i].className = "hb-seat seat-status-free";
}

function saveSeatsState(name)
{
	let seats = document.querySelectorAll(".seat-status-busy");
	let data = {};

	for (let i = seats.length - 1; i >= 0; i--)
		data[seats[i].getAttribute("data-seat-id")] = SEAT_BUSY;

    seats = document.querySelectorAll(".seat-status-book");

    for (let i = seats.length - 1; i >= 0; i--)
        data[seats[i].getAttribute("data-seat-id")] = SEAT_RESERVED;

    if (name)
		localStorage.setItem(STORAGE_SEATS_KEY + name, JSON.stringify(data));
	else
		sessionStorage.setItem(STORAGE_SEATS_KEY, JSON.stringify(data));
}

function loadSeatsState(name)
{
	let data;

	clearAllSeats();
	SalesCount = ReserveCount = 0;

	if (name)
		data = JSON.parse(localStorage.getItem(STORAGE_SEATS_KEY + name));
	else
		data = JSON.parse(sessionStorage.getItem(STORAGE_SEATS_KEY));

	if (data)
	{
		let seats = document.querySelectorAll(".hb-seat");

		for (let i = seats.length - 1; i >= 0; i--)
		{
			let nseat = seats[i].getAttribute("data-seat-id");

			if (data.hasOwnProperty(nseat))
				if (data[nseat] === SEAT_BUSY) {
					seats[i].className = "hb-seat seat-status-busy";
					SalesCount++;
				} else if (data[nseat] === SEAT_RESERVED) {
					seats[i].className = "hb-seat seat-status-book";
					ReserveCount++;
				} else
					seats[i].className = "hb-seat seat-status-free";
		}
	}

	window.UpdateSalesSum();
}

function animateButton(b)
{
	let color_value = 51;
	let change_speed = 2;

	let anim_timer = setInterval(function()
	{
		b.style.color = "rgb(" + color_value + ",51, 51)";
		color_value += change_speed;

		if (color_value > 255)
			change_speed = -2;
		else if (color_value <= 51)
			change_speed = 2;

		if (_TradeState === TSTATE.IDLE) {
			b.style.color = "#333";
			clearInterval(anim_timer);
		}
	}, 10);
}

function disableButton(b)
{
	b.classList.remove("x-btn");
	b.classList.add("x-btn-disabled");
}

function enableButton(b)
{
	b.classList.add("x-btn");
	b.classList.remove("x-btn-disabled");
}

function changeTradeState(state)
{
	let btn0_txt = MenuButtons[0].querySelector(".x-btn-inner");
    let btn1_txt = MenuButtons[1].querySelector(".x-btn-inner");
    let btn2_txt = MenuButtons[2].querySelector(".x-btn-inner");

	if (state === TSTATE.SALE_MENU && _TradeState !== TSTATE.SALE_MENU)
	{
		// Begin
		// Refund
		//
		// Back

		btn0_txt.textContent = LOCALE.Sale.Begin;
		btn1_txt.textContent = LOCALE.Sale.Refund;
        btn2_txt.textContent = LOCALE.Back;
	}
	else if (state === TSTATE.SALE && _TradeState !== TSTATE.SALE ||
			 state === TSTATE.RESERVE && _TradeState !== TSTATE.RESERVE)
	{
		// Finish sale
		// Cancel sale
		//
		// -

		btn0_txt.textContent = LOCALE.Confirm.Ok;
		btn1_txt.textContent = LOCALE.Confirm.Cancel;
		btn2_txt.textContent = "-";

		animateButton(btn0_txt);
	}
	else if (state === TSTATE.RESERVE_MENU && _TradeState !== TSTATE.RESERVE_MENU)
	{
        // Begin
        // Refund
		//
        // Back

        btn0_txt.textContent = LOCALE.Reserve.Begin;
        btn1_txt.textContent = LOCALE.Reserve.Refund;
        btn2_txt.textContent = LOCALE.Back;
	}
	else if (state === TSTATE.REFUND_SALE && _TradeState !== TSTATE.REFUND_SALE ||
			 state === TSTATE.REFUND_RESERVE && _TradeState !== TSTATE.REFUND_RESERVE)
	{
		// Finish refund/sale
		// Cancel refund/sale
		//
		// -

		btn0_txt.textContent = LOCALE.Confirm.Ok;
		btn1_txt.textContent = LOCALE.Confirm.Cancel;

		btn2_txt.textContent = "-";
		disableButton(MenuButtons[2]);

		animateButton(btn0_txt);
	}
	else if (state === TSTATE.IDLE)
	{
		// Sale
		// Reserve
		//
		// Full reset

		btn0_txt.textContent = LOCALE.Sale.MenuTitle;
		btn1_txt.textContent = LOCALE.Reserve.MenuTitle;
		btn2_txt.textContent = LOCALE.FullReset.MenuTitle;

		enableButton(MenuButtons[0]);
		enableButton(MenuButtons[1]);
		enableButton(MenuButtons[2]);

		if (_TradeState === TSTATE.SALE)
		{
			let seats = document.querySelectorAll(".seat-status-selected");

			for (let i = seats.length - 1; i >= 0; i--) {
				seats[i].classList.remove("seat-status-selected");
				seats[i].classList.add("seat-status-busy");
			}
			
			SalesCount += seats.length;
		}
        else if (_TradeState === TSTATE.RESERVE)
        {
            let seats = document.querySelectorAll(".seat-status-prebook");

            for (let i = seats.length - 1; i >= 0; i--)
                seats[i].className = "hb-seat seat-status-book";
            
            ReserveCount += seats.length;
        }
		else if (_TradeState === TSTATE.REFUND_SALE ||
				 _TradeState === TSTATE.REFUND_RESERVE)
		{
			let seats = document.querySelectorAll(".seat-status-sold");

			for (let i = seats.length - 1; i >= 0; i--)
				seats[i].className = "hb-seat seat-status-free";

			if (_TradeState === TSTATE.REFUND_SALE)
				SalesCount -= seats.length;
			else
				ReserveCount -= seats.length;
		}
		
		window.UpdateSalesSum();
	}

	_TradeState = state;
}

function getCurrentListName()
{
	let ix = SeatsList.selectedIndex;

	return ix >= 0 ? SeatsList[ix].textContent : "";
}

function onSeatClick(e)
{
	if (_TradeState === TSTATE.SALE)
	{
		let cList = e.target.parentNode.classList;
		let sid = e.target.parentNode.getAttribute("data-seat-id");

		if (sid >= SEATS_BASE && sid <= SEATS_MAX)
		{
			if (cList.contains("seat-status-free") || cList.contains("seat-status-selected"))
			{
				cList.toggle("seat-status-free");
				cList.toggle("seat-status-selected");
			}
		}
	}
    else if (_TradeState === TSTATE.RESERVE)
    {
        let cList = e.target.parentNode.classList;
        let sid = e.target.parentNode.getAttribute("data-seat-id");

        if (sid >= SEATS_BASE && sid <= SEATS_MAX)
        {
            if (cList.contains("seat-status-free") || cList.contains("seat-status-prebook"))
            {
                cList.toggle("seat-status-free");
                cList.toggle("seat-status-prebook");
            }
        }
    }
	else if (_TradeState === TSTATE.REFUND_SALE)
	{
		let cList = e.target.parentNode.classList;
		let sid = e.target.parentNode.getAttribute("data-seat-id");

		if (sid >= SEATS_BASE && sid <= SEATS_MAX)
		{
			if (cList.contains("seat-status-busy") || cList.contains("seat-status-sold"))
			{
				cList.toggle("seat-status-sold");
				cList.toggle("seat-status-busy");
			}
		}
	}
	else if (_TradeState === TSTATE.REFUND_RESERVE)
	{
		let cList = e.target.parentNode.classList;
		let sid = e.target.parentNode.getAttribute("data-seat-id");

		if (sid >= SEATS_BASE && sid <= SEATS_MAX)
		{
			if (cList.contains("seat-status-book") || cList.contains("seat-status-sold"))
			{
				cList.toggle("seat-status-sold");
				cList.toggle("seat-status-book");
			}
		}
	}
}

function onFirstCtrlButton(e)
{
	if (_TradeState === TSTATE.IDLE)                // Main menu -> sale menu
	{
		changeTradeState(TSTATE.SALE_MENU);
	}
	else if (_TradeState === TSTATE.SALE_MENU)      // Sale menu -> sale mode
	{
		changeTradeState(TSTATE.SALE);
	}
	else if (_TradeState === TSTATE.SALE)           // Sale mode -> finish sale
	{
		changeTradeState(TSTATE.IDLE);
		saveSeatsState(getCurrentListName());
	}
	else if (_TradeState === TSTATE.RESERVE_MENU)   // Reserve menu -> reserve mode
	{
		changeTradeState(TSTATE.RESERVE);
	}
    else if (_TradeState === TSTATE.RESERVE)        // Reserve mode -> finish reserve
    {
        changeTradeState(TSTATE.IDLE);
        saveSeatsState(getCurrentListName());
    }
	else if (_TradeState === TSTATE.REFUND_SALE ||  // Refund mode -> finish refund
			 _TradeState === TSTATE.REFUND_RESERVE)
	{
		changeTradeState(TSTATE.IDLE);
		saveSeatsState(getCurrentListName());
	}
}

function onSecondCtrlButton(e)
{
    if (_TradeState === TSTATE.IDLE)
    {
	    changeTradeState(TSTATE.RESERVE_MENU)
    }
    else if (_TradeState === TSTATE.SALE_MENU)
    {
	    changeTradeState(TSTATE.REFUND_SALE);
    }
    else if (_TradeState === TSTATE.RESERVE_MENU)
    {
	    changeTradeState(TSTATE.REFUND_RESERVE);
    }
    else if (_TradeState === TSTATE.REFUND_RESERVE)
    {
	    changeTradeState(TSTATE.REFUND_RESERVE);
    }
    else if (_TradeState === TSTATE.SALE ||
	    _TradeState === TSTATE.RESERVE ||
	    _TradeState === TSTATE.REFUND_SALE ||
	    _TradeState === TSTATE.REFUND_RESERVE)
    {
	    CancelAll();
    }
}

function onThirdCtrlButton(e)
{
	if (_TradeState === TSTATE.IDLE &&
		confirm(LOCALE.FullReset.Confirm))
	{
		localStorage.clear();
		sessionStorage.clear();

		clearAllSeats();
		refreshSeatsList();
	}
	else if (_TradeState === TSTATE.SALE_MENU ||
			 _TradeState === TSTATE.RESERVE_MENU)
	{
		changeTradeState(TSTATE.IDLE);
	}
}

function CancelAll()
{
	switch (_TradeState) {
		case TSTATE.SALE :
			CancelSale();
			break;
		case TSTATE.RESERVE :
			CancelReserve();
			break;
		case TSTATE.REFUND_SALE :
			CancelRefundSale();
			break;
		case TSTATE.REFUND_RESERVE :
			CancelRefundReserve();
			break;
		default :
			return;
	}

	changeTradeState(TSTATE.IDLE);
}

function CancelSale()
{
	let seats = document.querySelectorAll(".seat-status-selected");

	for (let i = seats.length - 1; i >= 0; i--)
	{
		seats[i].classList.add("seat-status-free");
		seats[i].classList.remove("seat-status-selected");
	}
}

function CancelReserve()
{
    let seats = document.querySelectorAll(".seat-status-prebook");

    for (let i = seats.length - 1; i >= 0; i--)
    {
        seats[i].classList.add("seat-status-free");
        seats[i].classList.remove("seat-status-prebook");
    }
}

function CancelRefundSale()
{
	let seats = document.querySelectorAll(".seat-status-sold");

	for (let i = seats.length - 1; i >= 0; i--)
	{
		seats[i].classList.add("seat-status-busy");
		seats[i].classList.remove("seat-status-sold");
	}
}

function CancelRefundReserve()
{
	let seats = document.querySelectorAll(".seat-status-sold");

	for (let i = seats.length - 1; i >= 0; i--)
	{
		seats[i].classList.add("seat-status-busy");
		seats[i].classList.remove("seat-status-sold");
	}

	changeTradeState(TSTATE.IDLE);
}

function onAddList()
{
	let name = prompt(LOCALE.Lists.New);

	if (name)
	{
		clearAllSeats();
		saveSeatsState(name);
		addNewSeatsList(name);

		SeatsList.appendChild(elt("option", null, name));
		SeatsList.selectedIndex = SeatsList.childElementCount - 1;

		window.UpdateSalesSum();
	}
}

function onDeleteList()
{
	if (confirm(LOCALE.Lists.Delete))
	{
		let cur_list = SeatsList[SeatsList.selectedIndex];

        delSeatsFromList(cur_list.textContent);

        if (cur_list.textContent)
        {
            SeatsList.removeChild(cur_list);
            SeatsList.selectedIndex = 0;
        }

        onListsItemChange();
    }
}

function onListsItemChange()
{
	loadSeatsState(getCurrentListName());
}

function onRenameList()
{
	let current_list = getCurrentListName();

	if (current_list)
	{
		let name = prompt(LOCALE.Lists.Rename);

		if (name)
		{
			if (renameSeatsList(name))
				refreshSeatsList(getSeatsListSelIndex());
			else
				alert(LOCALE.Lists.RenErr);
		}
	} else {
		alert(LOCALE.UseSaveAs);
	}
}

function onSaveListAs()
{
	let name = prompt(LOCALE.Lists.SaveAs);

	if (name)
	{
		saveSeatsState(name);
		addNewSeatsList(name);

		SeatsList.appendChild(elt("option", null, name));
		SeatsList.selectedIndex = SeatsList.childElementCount - 1;
	}
}

function onClearCurrentList()
{
	if (confirm(LOCALE.Lists.Clear))
	{
		clearAllSeats();
		saveSeatsState(getCurrentListName());
		onListsItemChange();
	}
}